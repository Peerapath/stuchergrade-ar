"""Builds box.glb (Lid + Base, dieline-mapped UVs) and card.glb.

Run: "D:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python tools/blender/build_models.py
Blender axes: X = box length, Y = box width (far side +Y), Z = up. glTF export converts to Y-up.
"""
import math
from pathlib import Path

import bmesh
import bpy

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / "tools" / "build"
OUT = ROOT / "assets" / "models"
IMG_W, IMG_H = 2000, 1414
PANEL = (288, 347, 1712, 1066)  # centre panel of every dieline: left, top, right, bottom (px)


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)


def make_material(name, image_path=None):
    mat = bpy.data.materials.new(name)
    if mat.node_tree is None:
        mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in nodes if n.type == "OUTPUT_MATERIAL"), None) or nodes.new("ShaderNodeOutputMaterial")
        links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 0.7
    if image_path is not None:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(str(image_path))
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def dieline_uv(length, width, flip_y):
    """Maps a point unfolded into the closed face's plane to dieline UVs.

    The flaps sit next to the centre panel at the same print scale, so walls map
    linearly by unfolding them flat. flip_y: image-top points to -Y instead of +Y
    (used for faces read from below, e.g. the box bottom).
    """
    left, top, right, bottom = PANEL

    def uv(x, y):
        if flip_y:
            y = -y
        px = left + (x + length / 2) / length * (right - left)
        py = bottom - (y + width / 2) / width * (bottom - top)
        return px / IMG_W, 1 - py / IMG_H

    return uv


def open_box(name, length, width, height, wall, open_top, outer_mat, inner_mat, outer_flip, inner_flip):
    """Thin-walled open box with origin at its bottom centre."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    hx, hy = length / 2, width / 2
    ix, iy = hx - wall, hy - wall
    z_out, z_in, z_rim = (0.0, wall, height) if open_top else (height, height - wall, 0.0)
    outer_uv = dieline_uv(length, width, outer_flip)
    inner_uv = dieline_uv(length, width, inner_flip)

    def unfold(x, y, z, side, z_face):
        d = abs(z - z_face)
        return {
            "face": (x, y),
            "+y": (x, hy + d),
            "-y": (x, -hy - d),
            "+x": (hx + d, y),
            "-x": (-hx - d, y),
        }[side]

    def quad(points, side, z_face, mapper, mat_index):
        face = bm.faces.new([bm.verts.new(p) for p in points])
        face.material_index = mat_index
        for loop in face.loops:
            x, y, z = loop.vert.co
            loop[uv_layer].uv = mapper(*unfold(x, y, z, side, z_face))

    def shell(ex, ey, z_face, z_edge, mapper, mat_index):
        quad([(-ex, -ey, z_face), (ex, -ey, z_face), (ex, ey, z_face), (-ex, ey, z_face)], "face", z_face, mapper, mat_index)
        quad([(-ex, ey, z_face), (ex, ey, z_face), (ex, ey, z_edge), (-ex, ey, z_edge)], "+y", z_face, mapper, mat_index)
        quad([(-ex, -ey, z_face), (ex, -ey, z_face), (ex, -ey, z_edge), (-ex, -ey, z_edge)], "-y", z_face, mapper, mat_index)
        quad([(ex, -ey, z_face), (ex, ey, z_face), (ex, ey, z_edge), (ex, -ey, z_edge)], "+x", z_face, mapper, mat_index)
        quad([(-ex, -ey, z_face), (-ex, ey, z_face), (-ex, ey, z_edge), (-ex, -ey, z_edge)], "-x", z_face, mapper, mat_index)

    shell(hx, hy, z_out, z_rim, outer_uv, 0)
    shell(ix, iy, z_in, z_rim, inner_uv, 1)
    z = z_rim
    quad([(-hx, hy, z), (hx, hy, z), (ix, iy, z), (-ix, iy, z)], "+y", z_in, inner_uv, 1)
    quad([(-hx, -hy, z), (hx, -hy, z), (ix, -iy, z), (-ix, -iy, z)], "-y", z_in, inner_uv, 1)
    quad([(hx, -hy, z), (hx, hy, z), (ix, iy, z), (ix, -iy, z)], "+x", z_in, inner_uv, 1)
    quad([(-hx, -hy, z), (-hx, hy, z), (-ix, iy, z), (-ix, -iy, z)], "-x", z_in, inner_uv, 1)

    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(outer_mat)
    mesh.materials.append(inner_mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def rounded_rect(w, h, r, segments=6):
    pts = []
    for cx, cy, start in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(segments + 1):
            a = math.radians(start + 90 * i / segments)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts  # counter-clockwise seen from +Z


def card(name="Card", w=0.07, h=0.12, t=0.0003, r=0.003):
    """Card lying flat; front (+Z) image-top toward +Y, back (-Z) image-top toward -Y."""
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.new("UVMap")
    outline = rounded_rect(w, h, r)
    top = [bm.verts.new((x, y, t / 2)) for x, y in outline]
    bottom = [bm.verts.new((x, y, -t / 2)) for x, y in outline]
    front = bm.faces.new(top)
    front.material_index = 0
    back = bm.faces.new(list(reversed(bottom)))
    back.material_index = 1
    for loop in front.loops:
        x, y, _ = loop.vert.co
        loop[uv_layer].uv = ((x + w / 2) / w, (y + h / 2) / h)
    for loop in back.loops:
        x, y, _ = loop.vert.co
        loop[uv_layer].uv = ((x + w / 2) / w, (-y + h / 2) / h)
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        edge = bm.faces.new([bottom[i], bottom[j], top[j], top[i]])
        edge.material_index = 1
        for loop in edge.loops:
            loop[uv_layer].uv = (0.5, 0.5)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(make_material("CardFront"))
    mesh.materials.append(make_material("CardBack"))
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def export(objects, path):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format="GLB", use_selection=True, export_yup=True,
        export_apply=True, export_materials="EXPORT", export_image_format="AUTO",
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    clear_scene()
    inside = make_material("BoxInside", BUILD / "box_inside.jpg")
    lid = open_box("Lid", 0.30, 0.15, 0.05, 0.002, False,
                   make_material("BoxFront", BUILD / "box_front.jpg"), inside, outer_flip=False, inner_flip=True)
    base = open_box("Base", 0.296, 0.146, 0.048, 0.002, True,
                    make_material("BoxBack", BUILD / "box_back.jpg"), inside, outer_flip=True, inner_flip=False)
    export([lid, base], OUT / "box.glb")
    export([card()], OUT / "card.glb")
    print("models written")


main()

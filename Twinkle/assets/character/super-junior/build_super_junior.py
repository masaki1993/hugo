"""Build Super Junior: stylized 10-year-old RPG hero, ~1.4m, humanoid rig.

Run:
  blender --background --python build_super_junior.py

Outputs next to this script:
  super-junior.blend
  super-junior.glb
  model.fbx
  preview-*.png
"""

import math
import os

import bpy
import bmesh
from mathutils import Matrix, Quaternion, Vector

ROOT = os.path.dirname(os.path.abspath(__file__))
FPS = 30

# Blender forward is -Y. Character right is -X.
FWD = Vector((0, -1, 0))
BACK = Vector((0, 1, 0))
UP = Vector((0, 0, 1))
OUT_L = Vector((1, 0, 0))
OUT_R = Vector((-1, 0, 0))


def srgb(hex_color):
    h = hex_color.lstrip("#")
    rgb = tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))

    def lin(u):
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4

    return (lin(rgb[0]), lin(rgb[1]), lin(rgb[2]), 1.0)


def activate(obj):
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    return obj


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def make_mat(name, hex_color, roughness=0.55, metallic=0.0, subsurface=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = srgb(hex_color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if subsurface and "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = subsurface
    if emission and "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = srgb(hex_color)
        bsdf.inputs["Emission Strength"].default_value = emission
    mat.use_backface_culling = False
    return mat


def assign_mat(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)


def smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    activate(obj)
    bpy.ops.object.shade_smooth()


def apply_modifiers(obj):
    activate(obj)
    for mod in list(obj.modifiers):
        if not mod.show_viewport:
            obj.modifiers.remove(mod)
            continue
        bpy.ops.object.modifier_apply(modifier=mod.name)


def freeze(obj):
    activate(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def bevel_subsurf(obj, width=0.018, segments=2, levels=1):
    bev = obj.modifiers.new("Bevel", "BEVEL")
    bev.width = width
    bev.segments = segments
    bev.limit_method = "ANGLE"
    bev.angle_limit = math.radians(50)
    if levels > 0:
        sub = obj.modifiers.new("Subsurf", "SUBSURF")
        sub.levels = levels
        sub.render_levels = levels
    apply_modifiers(obj)


def new_obj(name):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj)
    return obj


PARTS = []  # (object, bone)


def register(obj, bone, mat):
    assign_mat(obj, mat)
    smooth(obj)
    PARTS.append((obj, bone))
    return obj


def add_sphere(name, loc, scale, bone, mat, segs=32):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segs, ring_count=max(12, segs // 2), radius=1.0, location=loc
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    freeze(obj)
    return register(obj, bone, mat)


def delete_verts(obj, pred):
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for v in obj.data.vertices:
        v.select = bool(pred(v.co))
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.delete(type="VERT")
    bpy.ops.object.mode_set(mode="OBJECT")


def add_sphere_cut(name, loc, scale, bone, mat, pred, segs=32):
    obj = add_sphere(name, loc, scale, bone, mat, segs=segs)
    # add_sphere already registered; cut in place
    delete_verts(obj, pred)
    return obj


def add_cone(name, loc, radius, depth, rot, bone, mat, verts=14):
    bpy.ops.mesh.primitive_cone_add(
        vertices=verts, radius1=radius, radius2=radius * 0.08, depth=depth, location=loc
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Quaternion(rot) if len(rot) == 4 else Euler_quat(rot)
    freeze(obj)
    return register(obj, bone, mat)


def Euler_quat(rot):
    from mathutils import Euler

    return Euler(rot, "XYZ").to_quaternion()


def add_cylinder_along(name, a, b, radius, bone, mat, verts=16, taper=1.0, flatten=1.0):
    a, b = Vector(a), Vector(b)
    direction = b - a
    length = max(direction.length, 0.001)
    quat = direction.to_track_quat("Z", "Y")
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=length, location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    zs = [v.co.z for v in obj.data.vertices]
    z_max = max(zs) or 1
    for v in obj.data.vertices:
        if taper != 1.0 and v.co.z > 0:
            s = 1 - (1 - taper) * (v.co.z / z_max)
            v.co.x *= s
            v.co.y *= s
        v.co.x *= flatten
    obj.location = (a + b) / 2
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = quat
    freeze(obj)
    return register(obj, bone, mat)


def add_box(name, loc, size, bone, mat, rot=(0, 0, 0), bevel=0.012, levels=1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Euler_quat(rot)
    freeze(obj)
    if bevel:
        bevel_subsurf(obj, width=bevel, segments=2, levels=levels)
    return register(obj, bone, mat)


def add_torus(name, loc, major, minor, bone, mat, scale=(1, 1, 1), rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=28,
        minor_segments=10,
        location=loc,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Euler_quat(rot)
    freeze(obj)
    return register(obj, bone, mat)


def make_cape(mat):
    obj = new_obj("SJ_Cape")
    bm = bmesh.new()
    xs, zs = 12, 14
    for iz in range(zs + 1):
        tz = iz / zs
        z = 1.06 + (0.76 - 1.06) * tz
        y_center = 0.10 + 0.08 * (tz ** 1.15)
        w = 0.28 + 0.18 * tz
        for ix in range(xs + 1):
            tx = ix / xs
            x = (tx - 0.5) * w
            edge = abs(tx - 0.5) * 2
            y = y_center - edge * 0.07 + math.sin(tx * math.pi) * 0.025 * tz
            bm.verts.new((x, y, z))
    bm.verts.ensure_lookup_table()

    def vid(ix, iz):
        return iz * (xs + 1) + ix

    for iz in range(zs):
        for ix in range(xs):
            bm.faces.new(
                (
                    bm.verts[vid(ix, iz)],
                    bm.verts[vid(ix + 1, iz)],
                    bm.verts[vid(ix + 1, iz + 1)],
                    bm.verts[vid(ix, iz + 1)],
                )
            )
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    solid = obj.modifiers.new("Solidify", "SOLIDIFY")
    solid.thickness = 0.008
    solid.offset = 0
    apply_modifiers(obj)
    return register(obj, "Cape", mat)


def make_smile(mat):
    curve = bpy.data.curves.new("SJ_Smile", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 10
    curve.bevel_depth = 0.0032
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(2)
    coords = [(-0.026, -0.108, 1.185), (0.0, -0.120, 1.170), (0.026, -0.108, 1.185)]
    for point, co in zip(spline.bezier_points, coords):
        point.co = co
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new("SJ_Mouth", curve)
    link(obj)
    activate(obj)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    obj.name = "SJ_Mouth"
    return register(obj, "Head", mat)


def build_meshes():
    skin = make_mat("Skin", "#f3c7a6", roughness=0.48, subsurface=0.08)
    hair = make_mat("Hair", "#5a3825", roughness=0.62)
    tunic = make_mat("Tunic", "#3d5a80", roughness=0.58)
    tunic_trim = make_mat("TunicTrim", "#6e92b8", roughness=0.5)
    cape_mat = make_mat("Cape", "#c0392b", roughness=0.52)
    shorts_mat = make_mat("Shorts", "#6a442c", roughness=0.62)
    belt_mat = make_mat("Belt", "#5c3a22", roughness=0.55)
    boot_mat = make_mat("Boot", "#3a2618", roughness=0.58)
    boot_cuff = make_mat("BootCuff", "#6b4a32", roughness=0.55)
    gold = make_mat("Gold", "#d4a84b", roughness=0.32, metallic=0.85)
    steel = make_mat("Steel", "#d5dbe3", roughness=0.22, metallic=0.92)
    leather = make_mat("Leather", "#4a2e1c", roughness=0.48)
    eye_white = make_mat("EyeWhite", "#f7f4ef", roughness=0.18)
    iris = make_mat("Iris", "#6b3a1e", roughness=0.2)
    pupil = make_mat("Pupil", "#140c09", roughness=0.15)
    highlight = make_mat("Highlight", "#ffffff", roughness=0.05, emission=0.35)
    mouth = make_mat("Mouth", "#c47a6a", roughness=0.45)
    nose_mat = skin

    # Head and face. Large brown eyes, brave open brows.
    add_sphere("SJ_Head", (0, -0.008, 1.255), (0.112, 0.104, 0.118), "Head", skin, segs=40)
    add_sphere("SJ_Neck", (0, -0.01, 1.095), (0.046, 0.042, 0.055), "Neck", skin, segs=20)

    for side, x in (("L", 0.045), ("R", -0.045)):
        add_sphere(f"SJ_EyeWhite_{side}", (x, -0.102, 1.278), (0.034, 0.02, 0.036), "Head", eye_white, segs=24)
        add_sphere(f"SJ_Iris_{side}", (x, -0.116, 1.276), (0.02, 0.012, 0.022), "Head", iris, segs=20)
        add_sphere(f"SJ_Pupil_{side}", (x, -0.124, 1.276), (0.01, 0.007, 0.011), "Head", pupil, segs=16)
        add_sphere(
            f"SJ_Catch_{side}",
            (x + (0.008 if side == "L" else -0.008), -0.130, 1.288),
            (0.006, 0.004, 0.006),
            "Head",
            highlight,
            segs=12,
        )
        add_sphere(
            f"SJ_Lid_{side}",
            (x, -0.096, 1.308),
            (0.038, 0.02, 0.014),
            "Head",
            skin,
            segs=16,
        )
        brow_rot = (0.15, 0.0, 0.35 if side == "L" else -0.35)
        add_box(
            f"SJ_Brow_{side}",
            (x, -0.108, 1.322),
            (0.046, 0.012, 0.010),
            "Head",
            hair,
            rot=brow_rot,
            bevel=0.003,
            levels=1,
        )
        add_sphere(
            f"SJ_Ear_{side}",
            (0.108 if side == "L" else -0.108, 0.0, 1.24),
            (0.018, 0.012, 0.032),
            "Head",
            skin,
            segs=16,
        )

    add_sphere("SJ_Nose", (0, -0.112, 1.232), (0.016, 0.016, 0.018), "Head", nose_mat, segs=16)
    make_smile(mouth)

    # Hair: cap, bangs, side locks, two flicks.
    cap = add_sphere("SJ_HairCap", (0, 0.012, 1.305), (0.124, 0.118, 0.105), "Head", hair, segs=36)
    delete_verts(cap, lambda co: co.z < 1.25)
    bangs = add_sphere("SJ_Bangs", (0, -0.055, 1.325), (0.105, 0.055, 0.048), "Head", hair, segs=28)
    delete_verts(bangs, lambda co: co.y > -0.03)
    add_sphere("SJ_Lock_L", (0.09, -0.02, 1.22), (0.038, 0.04, 0.07), "Head", hair, segs=18)
    add_sphere("SJ_Lock_R", (-0.095, -0.015, 1.225), (0.034, 0.036, 0.055), "Head", hair, segs=18)
    add_cone(
        "SJ_Flick_L",
        (-0.04, -0.02, 1.40),
        0.038,
        0.11,
        (0.5, 0.15, 0.5),
        "Head",
        hair,
    )
    add_cone(
        "SJ_Flick_R",
        (0.055, 0.01, 1.385),
        0.03,
        0.08,
        (-0.7, 0.2, -0.4),
        "Head",
        hair,
    )

    # Torso, scarf, cape, belt.
    tunic_obj = add_box("SJ_Tunic", (0, -0.005, 0.88), (0.34, 0.20, 0.42), "Chest", tunic, bevel=0.02, levels=1)
    for v in tunic_obj.data.vertices:
        if v.co.z < 0.78:
            v.co.x *= 1.08
            v.co.y *= 1.05
    add_torus("SJ_Collar", (0, -0.012, 1.065), 0.062, 0.016, "Chest", tunic, scale=(1.15, 0.9, 0.7))
    add_sphere("SJ_Shoulder_L", (0.16, -0.01, 1.03), (0.055, 0.05, 0.05), "Arm.L", tunic, segs=18)
    add_sphere("SJ_Shoulder_R", (-0.16, -0.01, 1.03), (0.055, 0.05, 0.05), "Arm.R", tunic, segs=18)

    add_torus("SJ_Scarf", (0, -0.02, 1.105), 0.078, 0.022, "Neck", cape_mat, scale=(1.05, 0.95, 0.75))
    add_box(
        "SJ_ScarfTail_L",
        (-0.028, -0.09, 1.00),
        (0.026, 0.012, 0.14),
        "Chest",
        cape_mat,
        rot=(0.35, 0, 0.08),
        bevel=0.004,
        levels=1,
    )
    add_box(
        "SJ_ScarfTail_R",
        (0.022, -0.088, 0.97),
        (0.024, 0.012, 0.18),
        "Chest",
        cape_mat,
        rot=(0.5, 0, -0.12),
        bevel=0.004,
        levels=1,
    )
    make_cape(cape_mat)
    add_sphere("SJ_Clasp", (0, -0.09, 1.09), (0.016, 0.012, 0.016), "Neck", gold, segs=14)

    add_torus("SJ_Belt", (0, 0, 0.705), 0.145, 0.016, "Hips", belt_mat, scale=(1.12, 0.78, 0.65))
    add_box("SJ_Buckle", (0, -0.125, 0.705), (0.055, 0.018, 0.04), "Hips", gold, bevel=0.004, levels=0)

    # Arms. Right reaches the sword.
    add_cylinder_along("SJ_Sleeve_L", (0.15, 0.0, 1.03), (0.275, 0.02, 0.83), 0.055, "Arm.L", tunic, verts=16)
    add_cylinder_along("SJ_Sleeve_R", (-0.15, 0.0, 1.03), (-0.285, -0.045, 0.84), 0.055, "Arm.R", tunic, verts=16)
    add_cylinder_along("SJ_Forearm_L", (0.255, 0.015, 0.86), (0.30, -0.01, 0.67), 0.04, "Forearm.L", skin, verts=14)
    add_cylinder_along("SJ_Forearm_R", (-0.265, -0.03, 0.87), (-0.35, -0.13, 0.71), 0.04, "Forearm.R", skin, verts=14)
    add_sphere("SJ_Elbow_L", (0.27, 0.02, 0.84), (0.04, 0.04, 0.04), "Forearm.L", skin, segs=14)
    add_sphere("SJ_Elbow_R", (-0.28, -0.04, 0.85), (0.04, 0.04, 0.04), "Forearm.R", skin, segs=14)
    add_sphere("SJ_Hand_L", (0.31, -0.03, 0.60), (0.034, 0.028, 0.042), "Hand.L", skin, segs=16)
    add_sphere("SJ_Thumb_L", (0.285, -0.05, 0.615), (0.014, 0.012, 0.016), "Hand.L", skin, segs=12)
    add_sphere("SJ_Hand_R", (-0.36, -0.175, 0.655), (0.032, 0.03, 0.036), "Hand.R", skin, segs=16)

    # Legs, shorts, boots.
    add_box("SJ_ShortsHip", (0, 0, 0.655), (0.30, 0.19, 0.13), "Hips", shorts_mat, bevel=0.014, levels=1)
    add_cylinder_along("SJ_Short_L", (0.085, 0.0, 0.66), (0.09, 0.008, 0.40), 0.072, "Leg.L", shorts_mat, verts=16)
    add_cylinder_along("SJ_Short_R", (-0.085, 0.0, 0.66), (-0.09, 0.008, 0.40), 0.072, "Leg.R", shorts_mat, verts=16)
    add_sphere("SJ_Knee_L", (0.09, 0.01, 0.375), (0.04, 0.038, 0.04), "Shin.L", skin, segs=16)
    add_sphere("SJ_Knee_R", (-0.09, 0.01, 0.375), (0.04, 0.038, 0.04), "Shin.R", skin, segs=16)
    add_cylinder_along("SJ_BootShaft_L", (0.09, 0.005, 0.36), (0.09, 0.0, 0.07), 0.055, "Shin.L", boot_mat, verts=16)
    add_cylinder_along("SJ_BootShaft_R", (-0.09, 0.005, 0.36), (-0.09, 0.0, 0.07), 0.055, "Shin.R", boot_mat, verts=16)
    add_torus("SJ_Cuff_L", (0.09, 0.005, 0.345), 0.056, 0.013, "Shin.L", boot_cuff, scale=(1, 1, 0.65))
    add_torus("SJ_Cuff_R", (-0.09, 0.005, 0.345), 0.056, 0.013, "Shin.R", boot_cuff, scale=(1, 1, 0.65))
    add_sphere("SJ_Boot_L", (0.09, -0.035, 0.05), (0.05, 0.085, 0.04), "Foot.L", boot_mat, segs=20)
    add_sphere("SJ_Boot_R", (-0.09, -0.035, 0.05), (0.05, 0.085, 0.04), "Foot.R", boot_mat, segs=20)

    # Épée du Courage. Flat tapering blade, small cup, crossguard.
    direction = Vector((0.03, -0.48, -0.82)).normalized()
    hand = Vector((-0.36, -0.18, 0.66))
    tip = hand + direction * 0.66
    pommel = hand - direction * 0.13
    guard = hand + direction * 0.04
    add_cylinder_along("SJ_Blade", guard, tip, 0.02, "Sword", steel, verts=12, taper=0.1, flatten=0.5)
    add_cylinder_along("SJ_Cup", guard - direction * 0.01, guard + direction * 0.025, 0.036, "Sword", gold, verts=16)
    add_cylinder_along("SJ_Grip", hand - direction * 0.01, pommel + direction * 0.02, 0.014, "Sword", leather, verts=12)
    add_sphere("SJ_Pommel", pommel, (0.02, 0.02, 0.02), "Sword", gold, segs=14)
    # Crossguard along character right/left.
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=10, radius=0.011, depth=0.13, location=guard, rotation=(0, math.pi / 2, 0.15)
    )
    guard_bar = bpy.context.active_object
    guard_bar.name = "SJ_Crossguard"
    freeze(guard_bar)
    register(guard_bar, "Sword", gold)
    # Fingers wrapped on the grip.
    grip = hand - direction * 0.035
    for i, ang in enumerate((0.2, 1.4, 2.4)):
        offset = Vector((math.cos(ang) * 0.02, -0.016, math.sin(ang) * 0.012))
        add_sphere(f"SJ_Finger_{i}", grip + offset, (0.015, 0.012, 0.014), "Hand.R", skin, segs=10)

    return {
        "direction": direction,
        "hand": hand,
        "tip": tip,
        "pommel": pommel,
    }


def add_bone(arm_data, name, head, tail, parent=None, deform=True):
    bone = arm_data.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    bone.use_deform = deform
    if parent is not None:
        bone.parent = parent
    try:
        bone.align_roll(Vector((0, -1, 0)))
    except Exception:
        pass
    if (Vector(tail) - Vector(head)).length < 0.02:
        raise RuntimeError(f"bone {name} is too short")
    return bone


def build_armature(sword):
    arm_data = bpy.data.armatures.new("SuperJunior")
    arm = bpy.data.objects.new("SuperJunior", arm_data)
    link(arm)
    activate(arm)
    bpy.ops.object.mode_set(mode="EDIT")

    root = add_bone(arm_data, "Root", (0, 0, 0), (0, 0, 0.18), deform=False)
    hips = add_bone(arm_data, "Hips", (0, 0, 0.66), (0, 0, 0.78), root)
    spine = add_bone(arm_data, "Spine", (0, 0, 0.78), (0, 0, 0.92), hips)
    chest = add_bone(arm_data, "Chest", (0, 0, 0.92), (0, -0.01, 1.08), spine)
    neck = add_bone(arm_data, "Neck", (0, -0.01, 1.08), (0, -0.012, 1.16), chest)
    add_bone(arm_data, "Head", (0, -0.012, 1.16), (0, -0.012, 1.38), neck)
    add_bone(arm_data, "Cape", (0, 0.12, 1.05), (0, 0.22, 0.64), chest)

    arm_l = add_bone(arm_data, "Arm.L", (0.16, 0.0, 1.02), (0.27, 0.02, 0.84), chest)
    fore_l = add_bone(arm_data, "Forearm.L", (0.27, 0.02, 0.84), (0.30, -0.01, 0.67), arm_l)
    add_bone(arm_data, "Hand.L", (0.30, -0.01, 0.67), (0.31, -0.04, 0.58), fore_l)

    arm_r = add_bone(arm_data, "Arm.R", (-0.16, 0.0, 1.02), (-0.28, -0.04, 0.85), chest)
    fore_r = add_bone(arm_data, "Forearm.R", (-0.28, -0.04, 0.85), (-0.35, -0.13, 0.71), arm_r)
    hand_r = add_bone(arm_data, "Hand.R", (-0.35, -0.13, 0.71), sword["hand"], fore_r)
    add_bone(arm_data, "Sword", sword["pommel"], sword["tip"], hand_r)

    leg_l = add_bone(arm_data, "Leg.L", (0.085, 0, 0.64), (0.09, 0.01, 0.38), hips)
    shin_l = add_bone(arm_data, "Shin.L", (0.09, 0.01, 0.38), (0.09, 0.0, 0.11), leg_l)
    add_bone(arm_data, "Foot.L", (0.09, 0.0, 0.11), (0.09, -0.12, 0.035), shin_l)

    leg_r = add_bone(arm_data, "Leg.R", (-0.085, 0, 0.64), (-0.09, 0.01, 0.38), hips)
    shin_r = add_bone(arm_data, "Shin.R", (-0.09, 0.01, 0.38), (-0.09, 0.0, 0.11), leg_r)
    add_bone(arm_data, "Foot.R", (-0.09, 0.0, 0.11), (-0.09, -0.12, 0.035), shin_r)

    bpy.ops.object.mode_set(mode="OBJECT")
    arm.show_in_front = True
    arm.hide_render = True
    arm.data.display_type = "OCTAHEDRAL"

    arm["characterName"] = "Super Junior"
    arm["age"] = 10
    arm["height_m"] = 1.4
    arm["role"] = "Leader / All-rounder"
    arm["weapon"] = "Épée du Courage"
    arm["hp"] = 100
    arm["attack"] = 25
    arm["defense"] = 20
    arm["speed"] = 5.0
    arm["dashSpeed"] = 13.0
    arm["barrier"] = 100
    arm["critical"] = 0.05
    arm["dashCooldown"] = 0.65
    arm["attackCooldown"] = 0.38
    arm["braveSlash"] = 40
    return arm


def skin(arm):
    for obj, bone in PARTS:
        if bone not in arm.data.bones:
            raise RuntimeError(f"{obj.name} references missing bone {bone}")
        freeze(obj)
        group = obj.vertex_groups.new(name=bone)
        group.add([v.index for v in obj.data.vertices], 1.0, "REPLACE")
        modifier = obj.modifiers.new("Armature", "ARMATURE")
        modifier.object = arm
        world = obj.matrix_world.copy()
        obj.parent = arm
        obj.matrix_world = world


def join_meshes(arm):
    meshes = [obj for obj, _bone in PARTS]
    activate(meshes[0])
    for obj in meshes:
        obj.select_set(True)
    bpy.ops.object.join()
    mesh = bpy.context.active_object
    mesh.name = "SuperJuniorMesh"
    return mesh


class PoseBook:
    def __init__(self, arm):
        self.arm = arm
        self.rot = {}
        self.loc = {}
        self.axes = {}
        for name, pb in arm.pose.bones.items():
            m = pb.bone.matrix_local.to_3x3()
            cols = [m.col[i].normalized() for i in range(3)]
            self.axes[name] = cols

    def _slot(self, store, bone, frame):
        return store.setdefault(bone, {}).setdefault(frame, [0.0, 0.0, 0.0])

    def swing(self, bone, frame, degrees, toward):
        cols = self.axes[bone]
        y_axis = cols[1]
        target = Vector(toward).normalized()
        best_i, best_dot = 0, -2.0
        for i, axis in enumerate(cols):
            if i == 1:
                continue
            swing = axis.cross(y_axis)
            if swing.length < 1e-8:
                continue
            dot = swing.normalized().dot(target)
            if dot > best_dot:
                best_dot = dot
                best_i = i
        sign = 1.0 if best_dot >= 0 else -1.0
        self._slot(self.rot, bone, frame)[best_i] += sign * math.radians(degrees)

    def twist(self, bone, frame, degrees, around=UP):
        cols = self.axes[bone]
        target = Vector(around).normalized()
        best_i, best_dot = 0, 0.0
        for i, axis in enumerate(cols):
            dot = axis.dot(target)
            if abs(dot) > abs(best_dot):
                best_dot = dot
                best_i = i
        sign = 1.0 if best_dot >= 0 else -1.0
        self._slot(self.rot, bone, frame)[best_i] += sign * math.radians(degrees)

    def move(self, bone, frame, meters, toward):
        parent = self.arm.pose.bones[bone].parent
        m = parent.bone.matrix_local.to_3x3() if parent else Matrix.Identity(3)
        target = Vector(toward).normalized()
        best_i, best_dot = 1, 0.0
        for i in range(3):
            dot = m.col[i].normalized().dot(target)
            if abs(dot) > abs(best_dot):
                best_dot = dot
                best_i = i
        sign = 1.0 if best_dot >= 0 else -1.0
        self._slot(self.loc, bone, frame)[best_i] += sign * meters

    def commit(self, name, interpolation="BEZIER"):
        activate(self.arm)
        bpy.ops.object.mode_set(mode="POSE")
        for pb in self.arm.pose.bones:
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = (0.0, 0.0, 0.0)
            pb.location = (0.0, 0.0, 0.0)

        action = bpy.data.actions.new(name)
        action.use_fake_user = True
        anim = self.arm.animation_data or self.arm.animation_data_create()
        anim.action = action
        slot = action.slots.new("OBJECT", self.arm.name)
        anim.action_slot = slot

        frames = set()
        for fmap in self.rot.values():
            frames.update(fmap)
        for fmap in self.loc.values():
            frames.update(fmap)
        for frame in sorted(frames):
            bpy.context.scene.frame_set(frame)
            for bone, fmap in self.rot.items():
                if frame not in fmap:
                    continue
                pb = self.arm.pose.bones[bone]
                pb.rotation_euler = fmap[frame]
                pb.keyframe_insert("rotation_euler", frame=frame)
            for bone, fmap in self.loc.items():
                if frame not in fmap:
                    continue
                pb = self.arm.pose.bones[bone]
                pb.location = fmap[frame]
                pb.keyframe_insert("location", frame=frame)

        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for kp in fc.keyframe_points:
                            kp.interpolation = interpolation

        track = anim.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        anim.action = None
        for pb in self.arm.pose.bones:
            pb.rotation_euler = (0.0, 0.0, 0.0)
            pb.location = (0.0, 0.0, 0.0)
        self.rot.clear()
        self.loc.clear()
        bpy.ops.object.mode_set(mode="OBJECT")
        print("action", name, "frames", min(frames), max(frames))


def build_animations(arm):
    book = PoseBook(arm)

    def breathe(frame, amount, cape):
        book.swing("Spine", frame, amount, FWD)
        book.swing("Chest", frame, amount * 0.6, FWD)
        book.swing("Head", frame, amount * 0.4, FWD)
        book.swing("Cape", frame, cape, BACK)
        book.swing("Arm.L", frame, amount, FWD)
        book.swing("Arm.R", frame, -amount * 0.5, FWD)

    for frame, amount, cape in ((1, 1.5, 4), (24, 4.5, 9), (48, 1.5, 4)):
        breathe(frame, amount, cape)
    book.commit("Idle")

    walk = (1, 9, 17, 25, 33)
    # leg L, leg R, shin L, shin R, arm L, arm R, twist, bob
    walk_keys = {
        1: (28, -22, 8, 42, -20, 18, 5, 0.012),
        9: (0, 0, 18, 16, 0, 0, 0, -0.008),
        17: (-22, 28, 42, 8, 18, -20, -5, 0.012),
        25: (0, 0, 16, 18, 0, 0, 0, -0.008),
        33: (28, -22, 8, 42, -20, 18, 5, 0.012),
    }
    for frame in walk:
        ll, lr, sl, sr, al, ar, twist, bob = walk_keys[frame]
        book.swing("Leg.L", frame, ll, FWD)
        book.swing("Leg.R", frame, lr, FWD)
        book.swing("Shin.L", frame, sl, BACK)
        book.swing("Shin.R", frame, sr, BACK)
        book.swing("Arm.L", frame, al, FWD)
        book.swing("Arm.R", frame, ar, FWD)
        book.swing("Forearm.L", frame, max(al, 0) * 0.4, FWD)
        book.swing("Forearm.R", frame, max(ar, 0) * 0.4, FWD)
        book.twist("Hips", frame, twist)
        book.twist("Chest", frame, -twist * 0.7)
        book.move("Hips", frame, bob, UP)
        book.swing("Cape", frame, 6 + abs(twist), BACK)
    book.commit("Walk")

    run = (1, 5, 9, 14, 18)
    run_keys = {
        1: (42, -30, 12, 55, -32, 28, 8, 0.02),
        5: (6, -6, 22, 20, -6, 6, 0, -0.02),
        9: (-30, 42, 55, 12, 28, -32, -8, 0.02),
        14: (-6, 6, 20, 22, 6, -6, 0, -0.02),
        18: (42, -30, 12, 55, -32, 28, 8, 0.02),
    }
    for frame in run:
        ll, lr, sl, sr, al, ar, twist, bob = run_keys[frame]
        book.swing("Spine", frame, 12, FWD)
        book.swing("Leg.L", frame, ll, FWD)
        book.swing("Leg.R", frame, lr, FWD)
        book.swing("Shin.L", frame, sl, BACK)
        book.swing("Shin.R", frame, sr, BACK)
        book.swing("Arm.L", frame, al, FWD)
        book.swing("Arm.R", frame, ar, FWD)
        book.twist("Hips", frame, twist)
        book.move("Hips", frame, bob, UP)
        book.swing("Cape", frame, 16, BACK)
    book.commit("Run")

    # Sword Slash: 0-70ms windup, 70-210ms hit, 210-380ms recovery. 30fps -> f1, f3, f6, f12.
    for frame, arm_r, fore, chest, cape in (
        (1, 0, 0, 0, 4),
        (3, -38, -15, 18, 6),
        (6, 48, 8, -26, 10),
        (12, 0, 0, 0, 4),
    ):
        book.swing("Arm.R", frame, arm_r, FWD)
        book.swing("Forearm.R", frame, fore, FWD)
        book.twist("Chest", frame, chest)
        book.twist("Hips", frame, chest * 0.35)
        book.swing("Cape", frame, cape, BACK)
        book.swing("Head", frame, chest * 0.15, FWD)
    book.commit("Sword Slash")

    for frame, arm_r, fore, chest in (
        (1, 0, 0, 0),
        (3, 50, 10, -8),
        (7, -20, 40, 16),
        (14, 0, 0, 0),
    ):
        book.swing("Arm.R", frame, arm_r, UP)
        book.swing("Forearm.R", frame, fore, FWD)
        book.twist("Chest", frame, chest)
        book.swing("Spine", frame, max(-arm_r, 0) * 0.15, FWD)
    book.commit("Sword Slash 2")

    for frame, lean, ll, lr, cape in (
        (1, 4, 8, -4, 6),
        (3, 22, 26, -16, 26),
        (7, 18, 20, -12, 22),
        (10, 2, 0, 0, 6),
    ):
        book.swing("Spine", frame, lean, FWD)
        book.swing("Chest", frame, lean * 0.4, FWD)
        book.swing("Leg.L", frame, ll, FWD)
        book.swing("Leg.R", frame, lr, FWD)
        book.swing("Shin.R", frame, max(-lr, 0) * 0.6, BACK)
        book.swing("Arm.L", frame, -lean, FWD)
        book.swing("Arm.R", frame, -lean * 0.4, FWD)
        book.swing("Cape", frame, cape, BACK)
        book.move("Hips", frame, -0.03 if lean > 10 else 0, UP)
    book.commit("Forward Dash")

    for frame, lean, slash, chest in (
        (1, 6, 0, 0),
        (4, 22, -30, 14),
        (8, 16, 58, -28),
        (14, 0, 0, 0),
    ):
        book.swing("Spine", frame, lean, FWD)
        book.swing("Leg.L", frame, lean + 8, FWD)
        book.swing("Arm.R", frame, slash, FWD)
        book.swing("Forearm.R", frame, max(slash, 0) * 0.4, FWD)
        book.twist("Chest", frame, chest)
        book.swing("Cape", frame, 12 + lean, BACK)
    book.commit("Dash Slash")

    for frame, open_deg in ((1, 0), (4, 28), (10, 52)):
        book.swing("Arm.L", frame, open_deg, FWD)
        book.swing("Arm.R", frame, open_deg, FWD)
        book.swing("Arm.L", frame, open_deg * 0.55, OUT_L)
        book.swing("Arm.R", frame, open_deg * 0.55, OUT_R)
        book.swing("Forearm.L", frame, -open_deg * 0.25, FWD)
        book.swing("Forearm.R", frame, -open_deg * 0.25, FWD)
        book.swing("Spine", frame, -open_deg * 0.08, FWD)
    book.commit("Barrier Start")

    for frame, pulse in ((1, 52), (18, 60), (36, 52)):
        book.swing("Arm.L", frame, pulse, FWD)
        book.swing("Arm.R", frame, pulse, FWD)
        book.swing("Arm.L", frame, pulse * 0.7, OUT_L)
        book.swing("Arm.R", frame, pulse * 0.7, OUT_R)
        book.swing("Forearm.L", frame, -18, FWD)
        book.swing("Forearm.R", frame, -18, FWD)
        book.swing("Chest", frame, (pulse - 36) * 0.4, FWD)
    book.commit("Barrier Loop")

    for frame, open_deg, recoil in ((1, 10, 0), (4, 48, -6), (8, 42, 2), (16, 36, 0)):
        book.swing("Arm.L", frame, open_deg, FWD)
        book.swing("Arm.R", frame, open_deg, FWD)
        book.swing("Arm.L", frame, open_deg * 0.7, OUT_L)
        book.swing("Arm.R", frame, open_deg * 0.7, OUT_R)
        book.swing("Spine", frame, recoil, FWD)
        book.swing("Head", frame, recoil * 0.4, BACK)
    book.commit("Barrier Perfect")

    for frame, back, head in ((1, 0, 0), (4, 16, 10), (8, 8, 4), (14, 0, 0)):
        book.swing("Spine", frame, back, BACK)
        book.swing("Head", frame, head, BACK)
        book.swing("Chest", frame, back * 0.5, BACK)
        book.swing("Arm.L", frame, back * 0.3, BACK)
        book.swing("Arm.R", frame, back * 0.2, BACK)
    book.commit("Hit")

    for frame, back in ((1, 0), (3, 22), (8, 14), (16, 0)):
        book.swing("Spine", frame, back, BACK)
        book.swing("Head", frame, back * 0.7, BACK)
        book.swing("Hips", frame, back * 0.25, BACK)
        book.swing("Cape", frame, 6 + back * 0.3, FWD)
    book.commit("Damage")

    for frame, lift in ((1, 0), (10, 70), (18, 120), (36, 120)):
        book.swing("Arm.L", frame, lift, UP)
        book.swing("Arm.R", frame, lift * 0.85, UP)
        book.swing("Spine", frame, -4 if lift else 0, FWD)
        book.swing("Head", frame, -3 if lift > 50 else 0, FWD)
    book.commit("Victory")

    for frame, fall, drop in ((1, 0, 0), (12, 28, -0.05), (24, 62, -0.2), (40, 78, -0.35)):
        book.swing("Hips", frame, fall, BACK)
        book.swing("Spine", frame, fall * 0.25, BACK)
        book.swing("Head", frame, fall * 0.2, BACK)
        book.swing("Arm.L", frame, fall * 0.15, FWD)
        book.swing("Arm.R", frame, fall * 0.1, FWD)
        book.move("Hips", frame, drop, UP)
        book.swing("Cape", frame, fall * 0.2, FWD)
    book.commit("Death")


def measure(mesh):
    zs = [(mesh.matrix_world @ v.co).z for v in mesh.data.vertices]
    print(f"HEIGHT z {min(zs):.3f} .. {max(zs):.3f}")
    mesh.data.calc_loop_triangles()
    print("TRIS", len(mesh.data.loop_triangles))
    print("BONES", [b.name for b in mesh.parent.data.bones])


def setup_preview(scene):
    world = bpy.data.worlds.new("Studio")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = srgb("#c5d0dc")
    bg.inputs["Strength"].default_value = 0.85

    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.name = "PreviewGround"
    assign_mat(ground, make_mat("Ground", "#b7aa9a", roughness=0.9))

    sun_data = bpy.data.lights.new("KeySun", "SUN")
    sun_data.energy = 3.2
    sun_data.angle = math.radians(8)
    sun = bpy.data.objects.new("KeySun", sun_data)
    link(sun)
    sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(-28))

    fill_data = bpy.data.lights.new("Fill", "AREA")
    fill_data.energy = 180
    fill_data.size = 2.4
    fill_data.color = (0.85, 0.9, 1.0)
    fill = bpy.data.objects.new("Fill", fill_data)
    link(fill)
    fill.location = (1.6, -1.8, 1.8)
    fill.rotation_euler = (math.radians(70), 0, math.radians(30))

    rim_data = bpy.data.lights.new("Rim", "AREA")
    rim_data.energy = 250
    rim_data.size = 1.4
    rim_data.color = (1.0, 0.92, 0.82)
    rim = bpy.data.objects.new("Rim", rim_data)
    link(rim)
    rim.location = (-1.2, 1.6, 1.7)
    rim.rotation_euler = (math.radians(60), 0, math.radians(200))

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 58
    cam = bpy.data.objects.new("Cam", cam_data)
    link(cam)
    scene.camera = cam
    target = bpy.data.objects.new("CamTarget", None)
    target.empty_display_type = "PLAIN_AXES"
    target.location = (0, 0, 0.72)
    link(target)
    con = cam.constraints.new("TRACK_TO")
    con.target = target
    con.track_axis = "TRACK_NEGATIVE_Z"
    con.up_axis = "UP_Y"
    return cam


def render_view(scene, cam, name, location):
    cam.location = location
    scene.frame_set(scene.frame_current)
    bpy.context.view_layer.update()
    scene.render.filepath = os.path.join(ROOT, f"preview-{name}.png")
    bpy.ops.render.render(write_still=True)
    print("rendered", scene.render.filepath)


def solo_action(arm, name, frame):
    action = bpy.data.actions[name]
    anim = arm.animation_data
    for track in anim.nla_tracks:
        track.mute = True
        for strip in track.strips:
            strip.mute = True
    anim.action = action
    anim.action_slot = action.slots[0]
    anim.action_influence = 1.0
    activate(arm)
    bpy.ops.object.mode_set(mode="POSE")
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (0.0, 0.0, 0.0)
        pb.location = (0.0, 0.0, 0.0)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    arm_l = tuple(round(v, 2) for v in arm.pose.bones["Arm.L"].rotation_euler)
    leg_l = tuple(round(v, 2) for v in arm.pose.bones["Leg.L"].rotation_euler)
    print("pose", name, "f", frame, "Arm.L", arm_l, "Leg.L", leg_l)


def mute_all(arm):
    anim = arm.animation_data
    if anim:
        anim.action = None
        for track in anim.nla_tracks:
            track.mute = False
            for strip in track.strips:
                strip.mute = False
    bpy.context.scene.frame_set(1)


def export_assets(arm, mesh):
    activate(mesh)
    arm.select_set(True)
    mesh.select_set(True)
    glb = os.path.join(ROOT, "super-junior.glb")
    fbx = os.path.join(ROOT, "model.fbx")
    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips=True,
        export_frame_range=False,
        export_anim_slide_to_zero=True,
        export_skins=True,
        export_extras=True,
        export_yup=True,
        export_def_bones=False,
        export_lights=False,
        export_cameras=False,
        export_morph=False,
    )
    bpy.ops.export_scene.fbx(
        filepath=fbx,
        use_selection=True,
        add_leaf_bones=False,
        bake_anim=True,
        bake_anim_use_nla_strips=True,
        bake_anim_use_all_actions=False,
        object_types={"ARMATURE", "MESH"},
        mesh_smooth_type="FACE",
        axis_forward="-Y",
        axis_up="Z",
        apply_unit_scale=True,
        use_armature_deform_only=True,
    )
    print("exported", glb)
    print("exported", fbx)


def setup_scene():
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1200
    scene.render.image_settings.file_format = "PNG"
    ee = getattr(scene, "eevee", None)
    if ee and hasattr(ee, "taa_render_samples"):
        ee.taa_render_samples = 16
    if ee and hasattr(ee, "use_raytracing"):
        ee.use_raytracing = False
    try:
        scene.view_settings.view_transform = "Standard"
        scene.view_settings.look = "None"
    except Exception:
        pass
    return scene


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = setup_scene()
    sword = build_meshes()
    arm = build_armature(sword)
    skin(arm)
    mesh = join_meshes(arm)
    measure(mesh)
    cam = setup_preview(scene)

    views = {
        "front": (0.0, -3.2, 0.95),
        "side": (-3.2, -0.05, 0.95),
        "back": (0.0, 3.2, 0.95),
        "threequarter": (-2.2, -2.35, 1.08),
    }
    for name, loc in views.items():
        render_view(scene, cam, name, loc)

    build_animations(arm)
    pose_shots = (
        ("walk", "Walk", 1, views["side"]),
        ("attack", "Sword Slash", 6, views["side"]),
        ("dash", "Forward Dash", 4, views["side"]),
        ("barrier", "Barrier Loop", 18, views["front"]),
    )
    for name, action, frame, loc in pose_shots:
        solo_action(arm, action, frame)
        render_view(scene, cam, name, loc)
    mute_all(arm)

    export_assets(arm, mesh)
    blend = os.path.join(ROOT, "super-junior.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend)
    print("saved", blend)


if __name__ == "__main__":
    main()

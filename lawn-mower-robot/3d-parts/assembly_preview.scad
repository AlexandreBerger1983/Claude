// ============================================================
//  PRÉVISUALISATION ASSEMBLAGE COMPLET - Johnny-Mow
//  NE PAS IMPRIMER - Fichier de visualisation uniquement
//  Ouvrir dans OpenSCAD et appuyer sur F5 (préview) ou F6 (render)
// ============================================================
include <params.scad>
use <chassis_base.scad>
use <track_link.scad>
use <wheel_sprocket.scad>
use <idler_wheel.scad>
use <motor_mount.scad>
use <blade_guard.scad>

$fn = 32;  // faible résolution pour la préview

// Châssis
chassis();

// Jupe de lame (dessous)
translate([0, 0, -blade_guard_H])
    blade_guard();

// Roues motrices (arrière, axe moteur)
for (side = [-1, 1]) {
    translate([-chassis_L/2 + 20, side * (chassis_W/2 - rail_W/2), chassis_H + rail_H/2])
        rotate([90, 0, 0])
            color("DarkGray") sprocket();
}

// Roues folles (avant)
for (side = [-1, 1]) {
    translate([chassis_L/2 - 20, side * (chassis_W/2 - rail_W/2), chassis_H + rail_H/2])
        rotate([90, 0, 0])
            color("Gray") idler_wheel();
}

// Quelques maillons de chenille (représentation partielle)
for (side = [-1, 1]) {
    for (i = [0 : 6]) {
        translate([-chassis_L/2 + 20 + i * link_L, side * (chassis_W/2 - rail_W/2), chassis_H + rail_H - 5])
            color("Black", 0.8) track_link();
    }
    for (i = [0 : 6]) {
        translate([-chassis_L/2 + 20 + i * link_L, side * (chassis_W/2 - rail_W/2), chassis_H + 4])
            rotate([180, 0, 0]) color("Black", 0.8) track_link();
    }
}

// Supports moteurs
for (side = [-1, 1]) {
    translate([-chassis_L/2 + 20, side * (chassis_W/2 - rail_W/2), chassis_H + rail_H/2])
        color("Orange", 0.7) motor_mount();
}

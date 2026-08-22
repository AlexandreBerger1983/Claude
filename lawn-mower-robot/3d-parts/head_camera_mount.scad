// ============================================================
//  SUPPORT CAMÉRA SUR TÊTE - Johnny-Mow
//  Berceau pour caméra Wyze, fixé sur le palonnier du servo tilt.
//  La caméra suit ainsi les mouvements de tête (pan/tilt).
//  Imprimer : 1 pièce - PETG - 30% remplissage - supports : non
//  !! MESURER votre caméra et ajuster cam_W/cam_H/cam_D dans params.scad !!
// ============================================================
include <params.scad>

$fn = 48;

module head_camera_mount() {
    difference() {
        union() {
            // --- Berceau en U qui enveloppe la caméra ---
            difference() {
                // Coque externe
                translate([0, 0, cam_H/2 + cam_wall])
                    cube([cam_W + 2*cam_wall, cam_D + 2*cam_wall, cam_H + cam_wall], center=true);
                // Évidement caméra (ouvert vers le haut)
                translate([0, 0, cam_H/2 + cam_wall + 1])
                    cube([cam_W + tol, cam_D + tol, cam_H + 2], center=true);
                // Fenêtre avant pour l'objectif
                translate([0, -cam_D/2 - cam_wall, cam_H/2 + cam_wall])
                    cube([cam_W - 12, cam_wall*3, cam_H - 12], center=true);
            }

            // --- Platine inférieure (fixation servo tilt) ---
            translate([0, 0, cam_wall/2])
                cube([cam_W + 2*cam_wall, cam_D + 2*cam_wall, cam_wall], center=true);
        }

        // --- Trou central palonnier servo ---
        translate([0, 0, -1])
            cylinder(r=servo_horn_D/2 + tol, h=cam_wall + 2);

        // --- 4 trous de vis palonnier (M2, cercle ø16) ---
        for (a = [0:90:270]) {
            rotate([0, 0, a])
                translate([8, 0, -1])
                    cylinder(r=1.2, h=cam_wall + 2);
        }

        // --- Fentes pour sangle/serre-câble de maintien ---
        for (y = [-cam_D/4, cam_D/4]) {
            translate([cam_W/2 + cam_wall/2, y, cam_H/2 + cam_wall])
                cube([cam_wall + 2, 4, 8], center=true);
            translate([-cam_W/2 - cam_wall/2, y, cam_H/2 + cam_wall])
                cube([cam_wall + 2, 4, 8], center=true);
        }

        // --- Encoche câble d'alimentation (arrière de la Wyze Cam v3) ---
        translate([0, cam_D/2 + cam_wall/2, cam_wall + 6])
            cube([12, cam_wall*3, 12], center=true);
    }
}

head_camera_mount();

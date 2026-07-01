// ============================================================
//  ROUE FOLLE (IDLER) - Johnny-Mow
//  Imprimer : 2 à 4 pièces - PETG
//  Accueille un roulement 608 (8mm int, 22mm ext, 7mm large)
//  Remplissage : 40% - Périmètres : 4
// ============================================================
include <params.scad>

$fn = 128;

bearing_D_ext = 22;  // roulement 608
bearing_D_int = 8;
bearing_W     = 7;

module idler_wheel() {
    difference() {
        union() {
            // --- Corps roue ---
            cylinder(r=idler_D/2, h=idler_W, center=true);

            // --- Bossages roulements (un de chaque côté) ---
            for (z = [-idler_W/2 - bearing_W/2, idler_W/2 + bearing_W/2]) {
                translate([0, 0, z])
                    difference() {
                        cylinder(r=bearing_D_ext/2 + 3, h=bearing_W, center=true);
                        cylinder(r=bearing_D_ext/2 + tol, h=bearing_W + 1, center=true);
                    }
            }
        }

        // --- Logements des deux roulements (encastrés) ---
        for (z = [-(idler_W/2 - bearing_W/2 + 0.5), idler_W/2 - bearing_W/2 + 0.5]) {
            translate([0, 0, z])
                cylinder(r=bearing_D_ext/2 + tol, h=bearing_W + 1, center=true);
        }

        // --- Alésage axe central (à travers la roue) ---
        cylinder(r=idler_bore/2, h=idler_W + bearing_W*2 + 2, center=true);

        // --- Gorge de guidage chenille ---
        translate([0, 0, 0])
            difference() {
                cylinder(r=idler_D/2 + 1, h=6, center=true);
                cylinder(r=idler_D/2 - 5, h=8, center=true);
            }

        // --- Allégements ---
        for (i = [0 : 5]) {
            rotate([0, 0, i * 60])
                translate([idler_D/4, 0, 0])
                    cylinder(r=7, h=idler_W - 6, center=true);
        }
    }
}

// --- Axe de roue folle (optionnel, peut être un boulon M8) ---
module idler_axle() {
    // Axe M8 × 60mm avec têtes anti-rotation
    cylinder(r=3.9, h=60, center=true);
    for (z = [-28, 28]) {
        translate([0, 0, z])
            cylinder(r=7, h=4, center=true);
    }
}

idler_wheel();
// Décommenter pour voir l'axe :
// translate([idler_D + 15, 0, 0]) idler_axle();

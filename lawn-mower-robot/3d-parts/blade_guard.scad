// ============================================================
//  JUPE DE PROTECTION LAME - Johnny-Mow
//  Imprimer : 1 pièce - PETG ou ABS
//  !! Pièce de sécurité critique - périmètres : 6, remplissage : 60% !!
//  Se fixe sous le châssis autour de la lame
// ============================================================
include <params.scad>

$fn = 128;

blade_R     = blade_D/2 + blade_clearance;
guard_R_out = blade_R + blade_guard_t;
guard_R_in  = blade_R;

// Ouvertures herbe : 3 entrées (avant) + 1 sortie éjection (arrière)
inlet_W     = 40;   // largeur ouverture herbe mm
inlet_H     = 18;   // hauteur ouverture herbe mm
outlet_W    = 60;   // largeur sortie éjection mm
outlet_H    = 22;   // hauteur sortie éjection mm

module blade_guard() {
    difference() {
        union() {
            // --- Jupe cylindrique ---
            difference() {
                cylinder(r=guard_R_out, h=blade_guard_H);
                cylinder(r=guard_R_in - 0.1, h=blade_guard_H + 1);
            }

            // --- Bride de fixation sur châssis (en haut) ---
            difference() {
                cylinder(r=guard_R_out + 8, h=5);
                cylinder(r=guard_R_in - 4, h=6);
                // Allégement bride
                for (i = [0:5]) {
                    rotate([0, 0, i*60 + 30])
                        translate([guard_R_out + 2, 0, 0])
                            cylinder(r=7, h=7);
                }
            }

            // --- Canal d'éjection latéral (herbe coupée) ---
            translate([-(guard_R_out + 15), -outlet_W/2, 0])
                cube([20, outlet_W, blade_guard_H - 5]);
        }

        // --- Ouvertures d'entrée herbe (face avant, 3 fentes) ---
        for (angle = [-30, 0, 30]) {
            rotate([0, 0, angle + 90])
                translate([guard_R_in, -inlet_W/2, 3])
                    cube([blade_guard_t + 2, inlet_W, inlet_H]);
        }

        // --- Ouverture sortie éjection (face gauche) ---
        translate([-(guard_R_out + 16), -outlet_W/2, 3])
            cube([22, outlet_W, outlet_H]);

        // --- Trous de fixation sur châssis (6 vis M3, répartis) ---
        for (i = [0:5]) {
            rotate([0, 0, i * 60])
                translate([guard_R_out + 3, 0, 2])
                    cylinder(r=1.6, h=8);
        }

        // --- Chanfrein bas (évite l'accumulation) ---
        translate([0, 0, -1])
            difference() {
                cylinder(r=guard_R_out + 1, h=4);
                cylinder(r=guard_R_out - 3, h=5);
            }
    }
}

// --- Déflecteur herbe coupée (optionnel) ---
module deflector() {
    translate([-(guard_R_out + 20), -outlet_W/2 - 3, 0])
    difference() {
        cube([25, outlet_W + 6, blade_guard_H]);
        translate([3, 3, -1])
            cube([22, outlet_W, blade_guard_H + 2]);
        // Angle d'éjection
        translate([0, -1, 0])
            rotate([0, -20, 0])
                cube([30, outlet_W + 8, blade_guard_H + 5]);
    }
}

blade_guard();
// Décommenter pour voir le déflecteur :
// deflector();

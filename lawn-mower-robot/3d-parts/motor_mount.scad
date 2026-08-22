// ============================================================
//  SUPPORT MOTEUR DC - Johnny-Mow
//  Imprimer : 4 pièces (2 avant + 2 arrière) - PETG
//  Compatible moteur DC gearmotor ø37mm (Yellow Motor ou similaire)
//  Remplissage : 60% - Périmètres : 4
// ============================================================
include <params.scad>

$fn = 64;

mount_W  = rail_W - rail_wall*2 - 2;  // largeur du berceau
mount_H  = motor_D + 12;              // hauteur du support
mount_L  = 45;                         // longueur du support
clamp_t  = 4;                          // épaisseur de la bride de serrage

module motor_mount() {
    difference() {
        union() {
            // --- Plaque de base (fixation sur rail) ---
            cube([mount_L, mount_W, 6], center=true);

            // --- Berceau demi-cylindre ---
            translate([0, 0, 6/2 + motor_D/2 + 2])
                rotate([90, 0, 0])
                    half_cylinder(motor_D/2 + clamp_t, mount_W);

            // --- Oreilles de fixation (4 vis M3) ---
            for (x = [-mount_L/2 + 8, mount_L/2 - 8]) {
                for (y = [-mount_W/2 + 8, mount_W/2 - 8]) {
                    translate([x, y, -3])
                        cylinder(r=6, h=6, center=true);
                }
            }
        }

        // --- Alésage moteur ---
        translate([0, 0, 6/2 + motor_D/2 + 2])
            rotate([90, 0, 0])
                cylinder(r=motor_D/2 + tol, h=mount_W + 2, center=true);

        // --- Fente de serrage ---
        translate([0, 0, 6/2 + motor_D/2 + 2 + motor_D/2])
            cube([2, mount_W + 2, motor_D/2 + clamp_t + 2], center=true);

        // --- Vis de serrage M3 (horizontale) ---
        translate([0, 0, 6/2 + motor_D + 4])
            rotate([90, 0, 0])
                cylinder(r=1.6, h=mount_W + 2, center=true);
        // Fraisure écrou M3
        translate([0, mount_W/2 - 5, 6/2 + motor_D + 4])
            rotate([90, 0, 0])
                cylinder(r=3.2, h=5);

        // --- Trous de fixation sur rail (M3) ---
        for (x = [-mount_L/2 + 8, mount_L/2 - 8]) {
            for (y = [-mount_W/2 + 8, mount_W/2 - 8]) {
                translate([x, y, -4])
                    cylinder(r=1.6, h=10, center=true);
                // Fraisure tête vis
                translate([x, y, -6])
                    cylinder(r=3.2, h=4, center=true);
            }
        }

        // --- Passage de câbles moteur ---
        translate([motor_L/2 - 5, 0, 6/2 + motor_D/2 + 2])
            rotate([90, 0, 0])
                cylinder(r=5, h=mount_W + 2, center=true);
    }
}

module half_cylinder(r, h) {
    difference() {
        cylinder(r=r, h=h, center=true);
        translate([0, -r - 0.1, 0])
            cube([r*2 + 0.2, r*2, h + 0.2], center=true);
    }
}

motor_mount();

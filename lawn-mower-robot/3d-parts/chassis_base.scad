// ============================================================
//  CHÂSSIS PRINCIPAL - Johnny-Mow
//  Imprimer : 1 pièce - PETG ou ABS recommandé
//  Remplissage : 40% - Parois : 4 périmètres
// ============================================================
include <params.scad>

$fn = 64;

// Rayon lame + garde
blade_R = blade_D / 2 + blade_clearance;

module chassis() {
    difference() {
        union() {
            // --- Plaque de base centrale ---
            translate([0, 0, 0])
            hull() {
                translate([ chassis_L/2 - 15,  chassis_W/2 - rail_W - 15, 0]) cylinder(r=15, h=chassis_H);
                translate([-chassis_L/2 + 15,  chassis_W/2 - rail_W - 15, 0]) cylinder(r=15, h=chassis_H);
                translate([ chassis_L/2 - 15, -chassis_W/2 + rail_W + 15, 0]) cylinder(r=15, h=chassis_H);
                translate([-chassis_L/2 + 15, -chassis_W/2 + rail_W + 15, 0]) cylinder(r=15, h=chassis_H);
            }

            // --- Rails latéraux gauche et droite ---
            for (side = [-1, 1]) {
                translate([0, side * (chassis_W/2 - rail_W/2), 0])
                    rail();
            }

            // --- Plancher central surélevé (au-dessus de la lame) ---
            translate([0, 0, chassis_H])
            hull() {
                translate([ chassis_L/2 - 20,  chassis_W/2 - rail_W - 20, 0]) cylinder(r=20, h=center_H);
                translate([-chassis_L/2 + 20,  chassis_W/2 - rail_W - 20, 0]) cylinder(r=20, h=center_H);
                translate([ chassis_L/2 - 20, -chassis_W/2 + rail_W + 20, 0]) cylinder(r=20, h=center_H);
                translate([-chassis_L/2 + 20, -chassis_W/2 + rail_W + 20, 0]) cylinder(r=20, h=center_H);
            }

            // --- Nervures de rigidification ---
            for (y = [-60, 0, 60]) {
                translate([0, y, chassis_H])
                    cube([chassis_L - rail_W*2 - 10, 6, center_H - 4], center=true);
            }
            for (x = [-100, -33, 33, 100]) {
                translate([x, 0, chassis_H])
                    cube([6, chassis_W - rail_W*2 - 10, center_H - 4], center=true);
            }
        }

        // --- Évidement central pour la lame ---
        translate([0, 0, -1])
            cylinder(r=blade_R, h=chassis_H + 2);

        // --- Trous de fixation Raspberry Pi (58mm x 49mm) ---
        pi_holes();

        // --- Trous de fixation PCA9685 ---
        pca_holes();

        // --- Trous de passage câbles ---
        cable_holes();

        // --- Allégements plancher central ---
        for (pos = [[-80,50],[80,50],[-80,-50],[80,-50]]) {
            translate([pos[0], pos[1], chassis_H - 1])
                cylinder(r=18, h=center_H + 2);
        }
    }
}

module rail() {
    difference() {
        union() {
            // Corps principal du rail
            cube([chassis_L, rail_W, chassis_H + rail_H], center=true);
            // Lèvre intérieure de guidage chenille
            translate([0, -rail_W/2 + rail_wall + 2, (chassis_H + rail_H)/2 - rail_H/2])
                cube([chassis_L, 4, rail_H/2], center=true);
            translate([0,  rail_W/2 - rail_wall - 2, (chassis_H + rail_H)/2 - rail_H/2])
                cube([chassis_L, 4, rail_H/2], center=true);
        }
        // Allégement intérieur
        translate([0, 0, chassis_H + 2])
            cube([chassis_L - 30, rail_W - rail_wall*2, rail_H + 2], center=true);
        // Trous de fixation moteur (avant et arrière)
        for (x = [chassis_L/2 - 25, -chassis_L/2 + 25]) {
            translate([x, 0, chassis_H + rail_H/2])
                rotate([90, 0, 0])
                    cylinder(r=motor_D/2 + 1, h=rail_W + 2, center=true);
        }
    }
}

module pi_holes() {
    // Raspberry Pi 4 - espacement 58mm x 49mm
    for (pos = [[29, 24.5], [29, -24.5], [-29, 24.5], [-29, -24.5]]) {
        translate([pos[0] + 60, pos[1], chassis_H + center_H - 6])
            cylinder(r=1.6, h=10);
        // Fraisure pour vis M2.5
        translate([pos[0] + 60, pos[1], chassis_H + center_H - 3])
            cylinder(r=2.8, h=4);
    }
}

module pca_holes() {
    // PCA9685 - espacement 50.5mm x 25mm
    for (pos = [[25.25, 12.5], [25.25, -12.5], [-25.25, 12.5], [-25.25, -12.5]]) {
        translate([pos[0] - 60, pos[1], chassis_H + center_H - 6])
            cylinder(r=1.6, h=10);
    }
}

module cable_holes() {
    // Passages de câbles moteurs
    for (pos = [[chassis_L/2 - 30, 0], [-chassis_L/2 + 30, 0]]) {
        translate([pos[0], pos[1], -1])
            cylinder(r=8, h=chassis_H + 2);
    }
    // Passages I2C et GPIO
    for (pos = [[0, 60], [0, -60]]) {
        translate([pos[0], pos[1], chassis_H - 1])
            cube([20, 8, center_H + 2], center=true);
    }
}

// Rendu final
chassis();

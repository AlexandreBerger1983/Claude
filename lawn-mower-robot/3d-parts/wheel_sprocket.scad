// ============================================================
//  ROUE MOTRICE / PIGNON - Johnny-Mow
//  Imprimer : 2 pièces (une par côté) - PETG ou ABS
//  Remplissage : 50% - Périmètres : 4
//  Support : NON (symétrique)
// ============================================================
include <params.scad>

$fn = 128;

module sprocket() {
    difference() {
        union() {
            // --- Jante de base ---
            cylinder(r=wheel_D/2, h=wheel_W, center=true);

            // --- Dents du pignon ---
            for (i = [0 : teeth - 1]) {
                angle = i * 360 / teeth;
                rotate([0, 0, angle])
                    translate([wheel_D/2, 0, 0])
                        tooth();
            }

            // --- Hub central renforcé ---
            cylinder(r=wheel_bore/2 + 8, h=wheel_W + 8, center=true);
        }

        // --- Alésage axe moteur ---
        cylinder(r=wheel_bore/2, h=wheel_W + 10 + 1, center=true);

        // --- Clavette plate (flat on motor shaft) ---
        translate([0, wheel_bore/2 - 1, 0])
            cube([wheel_bore, 2, wheel_W + 12], center=true);

        // --- Vis de serrage M3 radiale ---
        translate([wheel_bore/2 + 6, 0, 0])
            rotate([0, 90, 0])
                cylinder(r=1.6, h=10, center=true);
        translate([wheel_bore/2 + 6, 0, 0])
            rotate([0, 90, 0])
                cylinder(r=3.2, h=6);  // fraisure

        // --- Allégements (spokes) ---
        for (i = [0 : 5]) {
            rotate([0, 0, i * 60])
                translate([wheel_D/4, 0, 0])
                    cylinder(r=8, h=wheel_W - 4, center=true);
        }

        // --- Gorge de guidage chenille (bord intérieur) ---
        difference() {
            cylinder(r=wheel_D/2 + 1, h=4, center=true);
            cylinder(r=wheel_D/2 - 6, h=6, center=true);
        }
    }
}

module tooth() {
    // Profil de dent trapézoïdal pour engagement chenille
    linear_extrude(height=wheel_W, center=true)
        polygon([
            [-tooth_W/2, 0],
            [ tooth_W/2, 0],
            [ tooth_W/3, tooth_H],
            [-tooth_W/3, tooth_H],
        ]);
}

sprocket();

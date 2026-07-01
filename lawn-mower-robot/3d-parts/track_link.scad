// ============================================================
//  MAILLON DE CHENILLE - Johnny-Mow
//  Imprimer : 70-80 exemplaires - TPU 95A recommandé
//  (ou PETG rigide si TPU non disponible)
//  Remplissage : 80% - Périmètres : 4
//  PAS de support nécessaire (conçu pour impression à plat)
// ============================================================
include <params.scad>

$fn = 32;

pin_R = link_pin_D / 2;

module track_link() {
    difference() {
        union() {
            // --- Corps central du maillon ---
            hull() {
                translate([ link_L/2 - link_H/2, 0, link_H/2]) sphere(r=link_H/2);
                translate([-link_L/2 + link_H/2, 0, link_H/2]) sphere(r=link_H/2);
                translate([ link_L/2 - link_H/2, 0, link_H/2]) rotate([90,0,0]) cylinder(r=link_H/2, h=link_W, center=true);
                translate([-link_L/2 + link_H/2, 0, link_H/2]) rotate([90,0,0]) cylinder(r=link_H/2, h=link_W, center=true);
            }

            // --- Patins de traction (crampons) - face externe ---
            translate([0, 0, link_H])
                crampon();

            // --- Chapes d'articulation avant (mâle) ---
            // Deux oreilles extérieures côté +X
            for (y = [link_W/4, -link_W/4]) {
                translate([link_L/2, y, link_H/2])
                    rotate([90,0,0])
                        cylinder(r=link_H/2 - 0.5, h=link_W/4 - link_gap, center=true);
            }

            // --- Chapes d'articulation arrière (femelle élargie) ---
            // Une oreille centrale côté -X
            translate([-link_L/2, 0, link_H/2])
                rotate([90,0,0])
                    cylinder(r=link_H/2 - 0.5, h=link_W/2 - link_gap, center=true);
        }

        // --- Alésages de goupille avant (mâle) ---
        translate([link_L/2, 0, link_H/2])
            rotate([90,0,0])
                cylinder(r=pin_R + tol, h=link_W + 2, center=true);

        // --- Alésages de goupille arrière (femelle) ---
        translate([-link_L/2, 0, link_H/2])
            rotate([90,0,0])
                cylinder(r=pin_R + tol, h=link_W + 2, center=true);

        // --- Allégement central ---
        translate([0, 0, -1])
            cylinder(r=link_H/2 - 1.5, h=link_H - 1);

        // --- Encoche de dent de pignon (dessous) ---
        translate([0, 0, -1])
            cube([tooth_W + tol*2, link_W/3, link_H/2 + 2], center=true);
    }
}

module crampon() {
    // Crampon anti-glissement en chevron
    for (side = [-1, 1]) {
        translate([side * link_L/6, 0, 0])
        linear_extrude(height=4)
            polygon([
                [ 3*side,  link_W/2 - 3],
                [-3*side,  link_W/2 - 3],
                [-5*side,  0],
                [-3*side, -link_W/2 + 3],
                [ 3*side, -link_W/2 + 3],
                [ 5*side,  0],
            ]);
    }
}

// --- Goupille d'assemblage (à imprimer séparément, x2 par maillon) ---
module pin() {
    cylinder(r=pin_R - tol, h=link_W + 2, center=true);
    // Tête de goupille (empêche le glissement)
    translate([0, 0, link_W/2 + 2])
        cylinder(r=pin_R + 2, h=2);
    translate([0, 0, -link_W/2 - 4])
        cylinder(r=pin_R + 2, h=2);
}

// Décommenter pour afficher la goupille :
// translate([0, link_W + 5, 0]) rotate([90,0,0]) pin();

track_link();

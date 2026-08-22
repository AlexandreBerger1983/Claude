// ============================================================
//  GOUPILLE DE CHENILLE - Johnny-Mow
//  Imprimer : 150 exemplaires (2 par maillon) - PETG
//  Imprimée couchée pour une résistance maximale au cisaillement
//  Alternative plus durable : tige acier ø4mm coupée à 44mm
// ============================================================
include <params.scad>

$fn = 32;

pin_R = link_pin_D / 2;

// Couchée sur le plateau (axe horizontal)
rotate([90, 0, 0]) {
    cylinder(r=pin_R - tol, h=link_W + 2, center=true);
    // Têtes de retenue aux deux extrémités
    translate([0, 0,  link_W/2 + 1]) cylinder(r=pin_R + 2, h=2);
    translate([0, 0, -link_W/2 - 3]) cylinder(r=pin_R + 2, h=2);
}

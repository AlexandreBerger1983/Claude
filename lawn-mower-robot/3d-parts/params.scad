// ============================================================
//  PARAMÈTRES GLOBAUX - Johnny-Mow
//  Modifier ici pour adapter à votre robot
// ============================================================

// --- Châssis ---
chassis_L   = 350;   // longueur totale mm
chassis_W   = 300;   // largeur totale mm
chassis_H   = 8;     // épaisseur plaque de base mm
rail_W      = 52;    // largeur de chaque rail de chenille mm
rail_H      = 35;    // hauteur du rail latéral mm
rail_wall   = 4;     // épaisseur paroi rail mm
center_H    = 22;    // hauteur plancher central (dessus lame) mm

// --- Lame ---
blade_D     = 220;   // diamètre du disque lame mm
blade_clearance = 8; // jeu autour de la lame mm
blade_guard_H   = 25; // hauteur de la jupe de protection mm
blade_guard_t   = 3;  // épaisseur jupe mm

// --- Moteurs de roue ---
motor_D     = 37;    // diamètre corps moteur mm (DC gearmotor standard)
motor_shaft = 6;     // diamètre axe moteur mm
motor_L     = 68;    // longueur corps moteur mm

// --- Chenilles ---
link_L      = 32;    // longueur d'un maillon mm
link_W      = 42;    // largeur d'un maillon mm (= largeur piste)
link_H      = 9;     // hauteur d'un maillon mm
link_pin_D  = 4.2;   // diamètre des goupilles d'articulation mm
link_gap    = 0.4;   // jeu d'impression entre maillons mm

// --- Roues ---
wheel_D     = 64;    // diamètre roue / pignon mm
wheel_W     = 38;    // largeur roue mm
wheel_bore  = 6.2;   // alésage axe mm
teeth       = 14;    // nombre de dents du pignon
tooth_H     = 5;     // hauteur des dents mm
tooth_W     = 5;     // largeur de base des dents mm

// --- Roue folle ---
idler_D     = 54;    // diamètre roue folle mm
idler_W     = 38;    // largeur roue folle mm
idler_bore  = 8.2;   // alésage roulement mm (608 = 8mm)

// --- Support caméra sur la tête (Wyze Cam) ---
// MESURER votre caméra et ajuster ! Valeurs par défaut ~ Wyze Cam v3.
cam_W       = 51;    // largeur caméra mm
cam_H       = 51;    // hauteur caméra mm
cam_D       = 46;    // profondeur caméra mm
cam_wall    = 3;     // épaisseur du berceau mm
servo_horn_D = 22;   // diamètre du palonnier servo (tilt) mm

// --- Impression ---
nozzle      = 0.4;   // diamètre buse mm
layer       = 0.2;   // hauteur de couche mm
tol         = 0.2;   // tolérance d'assemblage mm

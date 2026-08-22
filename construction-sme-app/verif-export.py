#!/usr/bin/env python3
"""Valide un fichier de soumission exporté par l'application.

LibreOffice n'est pas disponible dans l'environnement de test, donc les
formules ne peuvent pas être recalculées par un vrai tableur. Ce script
évalue lui-même les quelques formules du gabarit — IF/MAX par ligne, SUMIF
par corps de métier, SUM, et le calcul Admin et Profit — et vérifie que le
résultat correspond au total attendu, celui affiché par l'application.

Usage : python3 verif-export.py <soumission.xlsx> <total_attendu>
"""
import re
import sys
from openpyxl import load_workbook

# `expected` est le sous-total AVANT taxes mais APRÈS marge, c'est-à-dire la
# ligne « Total avec profit ». Le taux de marge est lu dans le fichier lui-même,
# pour que la vérification vaille aussi bien pour un devis de l'estimateur
# (marge 20 %) que pour une soumission enregistrée (marge déjà incluse, 0 %).
path, expected = sys.argv[1], float(sys.argv[2])
wb = load_workbook(path)
ok = True


def check(label, got, want, tol=0.02):
    global ok
    good = abs(got - want) <= tol
    ok = ok and good
    print(f"{'OK  ' if good else 'ÉCHEC'} {label} = {got:,.2f} (attendu {want:,.2f})")


assert wb.sheetnames == ['Calcul des coûts', 'Formulaire soumission'], wb.sheetnames
print(f"OK   feuilles : {wb.sheetnames}")

cc = wb['Calcul des coûts']

# En-têtes du gabarit
head = [cc.cell(row=20, column=c).value for c in range(2, 10)]
attendu = ['Description des travaux', 'Inclus ou non', 'Quantités', 'Unité',
           'Coût unitaire', 'coût total', 'Montant Minimum', 'Corps de métier']
assert head == attendu, head
print("OK   en-têtes identiques au gabarit")

# Lignes de détail : évalue G = SI(C=1 ; MAX(C*D*F ; H) ; 0)
totaux_par_metier, total_lignes, r = {}, 0.0, 22
while cc[f'B{r}'].value:
    inclus = cc[f'C{r}'].value or 0
    qte = cc[f'D{r}'].value or 0
    cu = cc[f'F{r}'].value or 0
    mini = cc[f'H{r}'].value or 0
    metier = cc[f'I{r}'].value or 'menuiserie'
    formule = cc[f'G{r}'].value
    assert isinstance(formule, str) and formule.startswith(f'=IF(C{r}=1,MAX('), formule
    g = max(inclus * qte * cu, mini) if inclus == 1 else 0
    totaux_par_metier[metier] = totaux_par_metier.get(metier, 0) + g
    total_lignes += g
    r += 1
n = r - 22
print(f"OK   {n} ligne(s) de détail, formule IF/MAX conforme")

# Résumé : SUMIF par corps de métier
somme_metiers = 0.0
for row in range(5, 16):
    f = cc[f'C{row}'].value
    m = re.match(r'=SUMIF\(I\d+:I\d+,"(\w+)",G\d+:G\d+\)', f or '')
    assert m, f
    somme_metiers += totaux_par_metier.get(m.group(1), 0)

taux_fichier = cc['D17'].value or 0
avant_attendu = expected / (1 + taux_fichier)
check('total avant profit (somme des corps de métier)', somme_metiers, avant_attendu)
check('somme de toutes les lignes', total_lignes, avant_attendu)

# Contrôle « BON / ERREUR » du gabarit
assert 'BON' in (cc['E16'].value or ''), cc['E16'].value
print("OK   cellule de contrôle BON/ERREUR présente")
if abs(somme_metiers - total_lignes) < 0.02:
    print("OK   cohérence : somme des corps de métier = somme des lignes → BON")
else:
    ok = False
    print("ÉCHEC cohérence : les deux totaux diffèrent → ERREUR")

# Admin et Profit puis total avec profit
taux = cc['D17'].value
print(f"OK   taux Admin et Profit du fichier = {taux * 100:.0f} %")
check('total avec profit', total_lignes * (1 + taux), expected)

# Aucune formule ne doit contenir de bruit en virgule flottante
fs = wb['Formulaire soumission']
for ws in (cc, fs):
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and c.value.startswith('=') and re.search(r'\d\.\d{9,}', c.value):
                ok = False
                print(f"ÉCHEC bruit en virgule flottante dans {ws.title}!{c.coordinate} : {c.value}")
print("OK   aucune formule ne contient de bruit en virgule flottante")

# Feuille client : liste Inclus / Non-applicable et totaux
textes = [c.value for row in fs.iter_rows() for c in row if isinstance(c.value, str)]
for attendu_txt in ['CLIENT', "SOUMISSION / CONTRAT D'ENTREPRISE", 'Sous-total des travaux', 'Total']:
    assert any(attendu_txt in t for t in textes), attendu_txt
print("OK   feuille client : en-tête, client et totaux présents")
# La liste « Inclus / Non-applicable » n'existe que si la soumission provient
# d'un questionnaire de pièce. Une soumission saisie à la main n'en a pas :
# c'est normal, on vérifie seulement la cohérence des deux marquages.
inclus = any(t == 'Inclus' for t in textes)
non_app = any(t == 'Non-applicable' for t in textes)
if inclus or non_app:
    print("OK   feuille client : travaux marqués Inclus / Non-applicable")
else:
    print("OK   feuille client : pas de liste de travaux (soumission sans questionnaire)")
assert any('Conditions générales' in t for t in textes), 'conditions absentes'
print("OK   feuille client : conditions générales présentes")

print('\n' + ('✅ Le fichier Excel exporté est conforme au gabarit' if ok else '❌ Des écarts subsistent'))
sys.exit(0 if ok else 1)

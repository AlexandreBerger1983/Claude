// Conditions générales, texte d'acceptation et durée de validité, transcrits
// intégralement des modèles réels de soumission/contrat de l'entreprise
// (gabarits Word « imprimer/compta » et « email », et l'onglet « Formulaire
// soumission » des gabarits Excel salle de bain / cuisine). Utilisé partout
// où un devis est imprimé ou affiché en version finale, pour que le document
// généré par l'application soit identique au contrat papier existant.

export const QUOTE_VALIDITY_DAYS = 60

export const PAYMENT_TERMS_TEXT =
  "Les travaux seront payables selon leur avancement mensuel et devront être complètement acquittés à la fin des travaux. Les factures transmises par l'entrepreneur porteront intérêt au taux mensuel de 1 %."

export const CONDITIONS_GENERALES = [
  {
    text: "L'obtention et l'acquittement des frais des permis requis relèvent de la responsabilité du client.",
  },
  {
    text: "Toute aggravation des conditions d'exécution des travaux, incluant de façon non-limitative la présence de pourriture, sera considérée comme une modification ayant pour effet de changer le coût des travaux suivant les dispositions prévues en ce sens aux présentes.",
  },
  {
    text: "Lorsque des modifications ont pour effet de changer le coût des travaux, les parties doivent donner leur accord préalable et le prix en est calculé selon les modalités suivantes :",
    subItems: [
      'a. Selon un prix négocié jugé acceptable par les parties, ou à défaut :',
      "b. i. Les salaires des personnes occupées à l'exécution des travaux supplémentaires, selon les taux indiqués dans le décret relatif à l'industrie de la construction, plus les frais accessoires connexes imposés par les lois et décrets;",
      "ii. Le prix de revient des matériaux incorporés aux ouvrages supplémentaires ou nécessaires à leur exécution, incluant les taxes applicables;",
      "iii. Le matériel nécessaire, exception faite des outils habituels des artisans, selon le taux de location du marché;",
      'iv. Une majoration de 15 % est ajoutée au total des montants susmentionnés pour couvrir les frais généraux et les profits.',
      "Lorsqu'une partie des travaux supplémentaires est exécutée par un sous-traitant, la méthode stipulée s'applique également au sous-traitant exécutant — l'indemnité payable à l'entrepreneur est alors de 10 % du prix payé au sous-traitant. Il appartient au client, lorsque des travaux supplémentaires sont exécutés, de se renseigner auprès de l'entrepreneur de l'état de l'avancement du prix de ces travaux.",
    ],
  },
  {
    text: `La présente soumission demeure valide pour soixante (${QUOTE_VALIDITY_DAYS}) jours suivant la date apparaissant à l'entête. À défaut par l'entrepreneur de recevoir par écrit l'acceptation de cette soumission à l'intérieur dudit délai, il pourra confirmer, modifier ou retirer sa soumission.`,
  },
  {
    text: PAYMENT_TERMS_TEXT,
  },
]

// Travaux toujours compris, imprimés tels quels sur les formulaires papier.
export const FIXED_INCLUDED_WORKS = [
  'Transporter les vidanges hors du site',
]

// Notes accompagnant certaines lignes sur les formulaires de l'entreprise.
export const CERAMIC_NOTE =
  'Note sur la céramique : la pose et la colle de la céramique sont incluses. Le client doit fournir la céramique et le coulis.'

export const ELEC_ALLOCATION_LABEL = 'ÉLECTRICITÉ — ALLOCATION'

export const ELEC_ALLOCATION_NOTE =
  "Note sur l'électricité : ce montant est une allocation. À la fin du projet, il sera ajusté soit à la hausse soit à la baisse selon les travaux électriques réellement effectués."

export const ACCEPTANCE_TEXT =
  "J'accepte que cette soumission devienne le contrat qui lie les parties et que les travaux soient effectués tel que décrit ci-haut."

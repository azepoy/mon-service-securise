import tableauDesServices from './tableauDesServices.mjs';

const contenuActions = {
  duplication: {
    titre: 'Dupliquer',
    texte: 'Copier autant de fois que nécessaire les services sélectionnés. Toutes les données saisies apparaîtront dans les nouveaux services créés, hormis celles de la rubrique Homologuer.',
    initialise: () => {
      $('#nombre-copie').val(1);
    },
  },
  suppression: {
    titre: 'Supprimer',
    texte: 'Effacer toutes les données saisies et tous les résultats proposés par MonServiceSécurisé pour les services sélectionnés. Seuls les propriétaires peuvent supprimer.',
    initialise: () => {
      const { nomDuService, servicesSelectionnes } = tableauDesServices;
      const nbServicesSelectionnes = servicesSelectionnes.size;
      if (nbServicesSelectionnes === 1) {
        const idSelectionne = servicesSelectionnes.keys().next().value;
        $('#nombre-service-suppression').html(`le service <strong>${(nomDuService(idSelectionne))}</strong> `);
      } else {
        $('#nombre-service-suppression').html(`<strong>les ${nbServicesSelectionnes} services sélectionnés</strong> `);
      }
    },
  },
};

const gestionnaireTirroir = {
  afficheContenuAction: (identifiantAction) => {
    const { titre, texte, initialise } = contenuActions[identifiantAction];
    $('.titre-tirroir').text(titre);
    $('.texte-tirroir').text(texte);
    $('.bloc-contenu').hide();
    $(`#contenu-${identifiantAction}`).show();
    initialise();
    gestionnaireTirroir.basculeOuvert(true);
  },
  basculeOuvert: (statut) => {
    if (statut) $('.tirroir').addClass('ouvert');
    else $('.tirroir').removeClass('ouvert');
  },
};

export default gestionnaireTirroir;

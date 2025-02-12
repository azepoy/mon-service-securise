const uneSuggestion = (departement, nom) => ({
  departement,
  nom,
  label: `${nom} (${departement})`,
});

const rechercheSuggestions = (recherche, callback) => {
  if (recherche.length < 2) {
    callback([]);
    return;
  }

  const parametresRequete = { params: { recherche } };
  const departementSelectionne = $(
    '#departementEntitePublique-selectize'
  ).val();
  if (departementSelectionne !== '')
    parametresRequete.params.departement = departementSelectionne;

  axios.get('/api/annuaire/suggestions', parametresRequete).then((reponse) => {
    const suggestions = reponse.data.suggestions.map(({ departement, nom }) =>
      uneSuggestion(departement, nom)
    );

    callback(suggestions);
  });
};

$(() => {
  const nom = $('#nomEntitePublique').val();
  const departement = $('#departementEntitePublique').val();
  const enModeEdition = !!nom && !!departement;

  const $champSelectize = $('#nomEntitePublique-selectize').selectize({
    plugins: ['clear_button'],
    options: enModeEdition ? [uneSuggestion(departement, nom)] : [],
    items: enModeEdition ? [`${nom} (${departement})`] : [],
    valueField: 'label',
    labelField: 'label',
    searchField: 'label',
    loadingClass: 'chargement-en-cours',
    maxItems: 1,
    normalize: true,
    create: (input) => ({ nom: input, label: input }),
    render: {
      item: (item, escape) => `<div class="item" data-nom="${
        item.nom
      }" data-departement="${item.departement}">
                                    ${escape(item.label)}
                               </div>`,
      option: (option, escape) =>
        `<div class="option">${escape(option.label)}</div>`,
      option_create: () =>
        '<div class="create option-ajout">Ajouter mon organisation</div>',
    },
    load: (recherche, callback) => {
      $champSelectize[0].selectize.clearOptions();
      rechercheSuggestions(recherche, callback);
    },
    onItemAdd: (_value, $item) => {
      $('#nomEntitePublique').val($item.data('nom'));
    },
    onItemRemove: () => {
      $('#nomEntitePublique').val('');
    },
    score: () => {
      const aucunFiltrage = () => 1;
      return aucunFiltrage;
    },
  });

  const departements = JSON.parse($('#donnees-departements').text());
  $('#departementEntitePublique-selectize').selectize({
    plugins: ['aucun_resultat', 'clear_button'],
    options: departements.map((d) => ({ ...d, label: `${d.nom} (${d.code})` })),
    items: enModeEdition ? [departement] : [],
    valueField: 'code',
    labelField: 'label',
    searchField: 'label',
    maxItems: 1,
    render: {
      item: (item, escape) =>
        `<div class="item" data-departement="${item.code}">${escape(
          item.label
        )}</div>`,
      option: (option, escape) =>
        `<div class="option">${escape(option.label)}</div>`,
    },
    onItemAdd: (_value, $item) => {
      $('#departementEntitePublique').val($item.data('departement').toString());
    },
  });
});

import parametres from '../modules/parametres.js';

$(() => {
  const $bouton = $('.bouton');
  $bouton.click(() => {
    const params = parametres('form#homologation');

    axios.post('/api/homologation', params)
      .then((reponse) => (window.location = `/homologation/${reponse.data.idHomologation}`));
  });
});

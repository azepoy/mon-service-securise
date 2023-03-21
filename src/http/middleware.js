const basicAuth = require('express-basic-auth');
const pug = require('pug');
const { check } = require('express-validator');

const middleware = (configuration = {}) => {
  const { depotDonnees, adaptateurChiffrement, adaptateurJWT, login, motDePasse } = configuration;

  const authentificationBasique = basicAuth({
    challenge: true,
    realm: 'Administration MonServiceSécurisé',
    users: { [login]: motDePasse },
    unauthorizedResponse: () => pug.renderFile('src/vues/accesRefuse.pug'),
  });

  const positionneHeaders = (requete, reponse, suite) => {
    const { nonce } = requete;

    const defaultCsp = "default-src 'self'";
    const imgCsp = "img-src 'self' data:";
    const styleCsp = nonce ? `style-src 'self' 'nonce-${nonce}'` : '';
    const scriptCsp = "script-src 'self'";
    const toutesCsp = [defaultCsp, imgCsp, styleCsp, scriptCsp].filter((csp) => csp !== '');

    reponse.set({
      'content-security-policy': `${toutesCsp.join('; ')}`,
      'x-frame-options': 'deny',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    });

    suite();
  };

  const positionneHeadersAvecNonce = (requete, reponse, suite) => adaptateurChiffrement.nonce()
    .then((n) => {
      requete.nonce = n;
      positionneHeaders(requete, reponse, suite);
    })
    .catch(suite);

  const repousseExpirationCookie = (requete, _reponse, suite) => {
    requete.session.maintenant = Math.floor(Date.now() / 60_000);
    suite();
  };

  const suppressionCookie = (requete, _reponse, suite) => {
    requete.session = null;
    suite();
  };

  const verificationJWT = (requete, reponse, suite) => {
    const token = adaptateurJWT.decode(requete.session.token);
    if (!token) reponse.redirect('/connexion');
    else {
      depotDonnees.utilisateurExiste(token.idUtilisateur)
        .then((utilisateurExiste) => {
          if (!utilisateurExiste) reponse.redirect('/connexion');
          else {
            requete.idUtilisateurCourant = token.idUtilisateur;
            requete.cguAcceptees = token.cguAcceptees;
            suite();
          }
        });
    }
  };

  const verificationAcceptationCGU = (requete, reponse, suite) => {
    verificationJWT(requete, reponse, () => {
      if (!requete.cguAcceptees) reponse.redirect('/motDePasse/edition');
      else suite();
    });
  };

  const trouveHomologation = (requete, reponse, suite) => {
    const idHomologation = requete.params.id;

    verificationAcceptationCGU(requete, reponse, () => depotDonnees.homologation(idHomologation)
      .then((homologation) => {
        const idUtilisateur = requete.idUtilisateurCourant;

        if (!homologation) reponse.status(404).send('Homologation non trouvée');
        else {
          depotDonnees.accesAutorise(idUtilisateur, idHomologation)
            .then((accesAutorise) => {
              if (!accesAutorise) reponse.status(403).send("Accès à l'homologation refusé");
              else {
                requete.homologation = homologation;
                suite();
              }
            });
        }
      })
      .catch(() => reponse.status(422).send("L'homologation n'a pas pu être récupérée")));
  };

  const aseptise = (...nomsParametres) => ((requete, _reponse, suite) => {
    const paramsTableauxVides = Object.keys(requete.body)
      .filter((p) => (Array.isArray(requete.body[p]) && requete.body[p].length === 0));

    const aseptisations = nomsParametres.map((p) => check(p).trim().escape().run(requete));

    return Promise.all(aseptisations)
      .then(() => paramsTableauxVides.forEach((p) => (requete.body[p] = [])))
      .then(() => suite())
      .catch(suite);
  });

  const aseptiseListes = (listes) => (
    (requete, reponse, suite) => {
      const nonTableau = listes
        .filter(({ nom }) => !Array.isArray(requete.body[nom]))
        .map((p) => p.nom);

      if (nonTableau.length > 0) {
        reponse.status(400).send(`[${nonTableau.join(', ')}] devrait être un tableau`);
        return () => {};
      }

      listes.forEach(({ nom, proprietes }) => {
        requete.body[nom] &&= requete.body[nom].filter(
          (element) => proprietes.some((propriete) => element && element[propriete])
        );
      });
      const proprietesAAseptiser = listes.flatMap(({ nom, proprietes }) => (
        proprietes.map((propriete) => `${nom}.*.${propriete}`)
      ));
      return aseptise(proprietesAAseptiser)(requete, reponse, suite);
    }
  );

  const aseptiseListe = (nomListe, proprietesParametre) => (
    aseptiseListes([{ nom: nomListe, proprietes: proprietesParametre }])
  );

  return {
    aseptise,
    aseptiseListe,
    aseptiseListes,
    authentificationBasique,
    positionneHeaders,
    positionneHeadersAvecNonce,
    repousseExpirationCookie,
    suppressionCookie,
    trouveHomologation,
    verificationAcceptationCGU,
    verificationJWT,
  };
};

module.exports = middleware;

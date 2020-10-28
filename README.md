# TECHNOLOGIE (backend)

- editeur visual studio code
- langage nodejs
- bd en à utilsé une orm `prisma` qui permet d'offrir une abstraction sur 3 sgbd actualement qui sont (postgresql, mysq, sqlite) pour le developement
  on a utilisé sqlite pour sa facilité mais en production nous pensont utilisé une sgbd plus puissante tel que postgresql

## OUTILS

- typescript (super set de javascript qui offre une meilleur organisation sur tt pour les grand projet)
- expressjs (un http framework qui facilite le routage le traitement de body etc...)
- bcryptjs (pour la securité le hashage des mot de passes)
- date-fns (pour la facilite de manipulé les date)
- redis (une base de donner en memoire qui joue un role principale dans le system de notification)
- socket.io (websocket implementation qui permet REAL TIME COMMUNICATION entre le client et le server)
- yup (librerie qui permet la validation des inputs sur base de schema)
- jsonwebtoken (pour la securité (authentification))

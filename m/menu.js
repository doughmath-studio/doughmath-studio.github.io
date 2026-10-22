/* DoughMath Studio · QR table menu · guest viewer
 * No tracking, no cookies, no analytics, no third-party scripts.
 * Two ways to get the menu (both static):
 *   A) link mode : /m/#1<base64url(deflate-raw(JSON))>   (the menu lives inside the link)
 *   B) live mode : /m/?s=<published sheet id>&g=<gid>    (CSV of the owner's published Google Sheet)
 * All owner text is inserted with textContent only (never innerHTML).
 */
(function (global) {
  "use strict";

  var HOME = "https://doughmath-studio.github.io/qr/";
  var LANGS = ["en", "es", "pt", "fr", "de", "pl", "uk", "ru"];
  var LOCALES = { en: "en-US", es: "es-ES", pt: "pt-PT", fr: "fr-FR", de: "de-DE", pl: "pl-PL", uk: "uk-UA", ru: "ru-RU" };
  var THEMES = ["amber", "espresso", "pistachio", "berry", "mono"];
  var THEME_COLORS = { amber: "#eef1f6", espresso: "#2a1d17", pistachio: "#f3f6e9", berry: "#fff3f6", mono: "#ffffff" };
  var TAGS = ["V", "VG", "GF", "spicy"];
  var LIMITS = { sections: 60, items: 600, name: 160, title: 120, desc: 600, footer: 400, priceText: 40, json: 1048576 };

  // ---------- Labels (8 languages). Menu content itself is the owner's text. ----------
  var T = {
    en: {
      name: "English", menu: "Menu", allergens: "Allergens", soldOut: "Sold out", loading: "Loading the menu…", retry: "Try again",
      ask: "Allergy or special diet? Please ask our staff.",
      oldBrowser: "Update your browser to see this menu.",
      badLink: "This menu link looks damaged or incomplete. Please ask for a new QR code.",
      noMenu: "There is no menu to show here yet.",
      netErr: "The menu could not be loaded. Check your connection and try again.",
      csvErr: "The menu could not be read. Please let the staff know.",
      empty: "No dishes on this menu yet.",
      framed: "For your safety, this menu is shown only on its own page.", open: "Open the menu",
      scan: "Scan for the menu", table: "Table",
      tags: { V: "Vegetarian", VG: "Vegan", GF: "Gluten-free", spicy: "Spicy" },
      a: ["Cereals containing gluten", "Crustaceans", "Eggs", "Fish", "Peanuts", "Soybeans", "Milk", "Tree nuts", "Celery", "Mustard", "Sesame", "Sulphites", "Lupin", "Molluscs"]
    },
    es: {
      name: "Español", menu: "Carta", allergens: "Alérgenos", soldOut: "Agotado", loading: "Cargando la carta…", retry: "Reintentar",
      ask: "¿Alergia o dieta especial? Pregunta a nuestro personal.",
      oldBrowser: "Actualiza tu navegador para ver esta carta.",
      badLink: "El enlace de esta carta parece dañado o incompleto. Pide un código QR nuevo.",
      noMenu: "Todavía no hay carta que mostrar.",
      netErr: "No se pudo cargar la carta. Comprueba tu conexión e inténtalo de nuevo.",
      csvErr: "No se pudo leer la carta. Avisa al personal.",
      empty: "Todavía no hay platos en esta carta.",
      framed: "Por tu seguridad, esta carta solo se muestra en su propia página.", open: "Abrir la carta",
      scan: "Escanea para ver la carta", table: "Mesa",
      tags: { V: "Vegetariano", VG: "Vegano", GF: "Sin gluten", spicy: "Picante" },
      a: ["Cereales con gluten", "Crustáceos", "Huevos", "Pescado", "Cacahuetes", "Soja", "Leche", "Frutos de cáscara", "Apio", "Mostaza", "Sésamo", "Sulfitos", "Altramuces", "Moluscos"]
    },
    pt: {
      name: "Português", menu: "Menu", allergens: "Alergénios", soldOut: "Esgotado", loading: "A carregar o menu…", retry: "Tentar novamente",
      ask: "Alergia ou dieta especial? Pergunte à nossa equipa.",
      oldBrowser: "Atualize o seu navegador para ver este menu.",
      badLink: "O link deste menu parece danificado ou incompleto. Peça um novo código QR.",
      noMenu: "Ainda não há menu para mostrar.",
      netErr: "Não foi possível carregar o menu. Verifique a ligação e tente novamente.",
      csvErr: "Não foi possível ler o menu. Avise a equipa.",
      empty: "Ainda não há pratos neste menu.",
      framed: "Para sua segurança, este menu só é mostrado na sua própria página.", open: "Abrir o menu",
      scan: "Digitalize para ver o menu", table: "Mesa",
      tags: { V: "Vegetariano", VG: "Vegano", GF: "Sem glúten", spicy: "Picante" },
      a: ["Cereais com glúten", "Crustáceos", "Ovos", "Peixe", "Amendoins", "Soja", "Leite", "Frutos de casca rija", "Aipo", "Mostarda", "Sésamo", "Sulfitos", "Tremoços", "Moluscos"]
    },
    fr: {
      name: "Français", menu: "Carte", allergens: "Allergènes", soldOut: "Épuisé", loading: "Chargement de la carte…", retry: "Réessayer",
      ask: "Allergie ou régime particulier ? Demandez à notre équipe.",
      oldBrowser: "Mettez à jour votre navigateur pour voir cette carte.",
      badLink: "Le lien de cette carte semble abîmé ou incomplet. Demandez un nouveau QR code.",
      noMenu: "Aucune carte à afficher pour le moment.",
      netErr: "Impossible de charger la carte. Vérifiez votre connexion et réessayez.",
      csvErr: "Impossible de lire la carte. Prévenez l’équipe.",
      empty: "Aucun plat sur cette carte pour le moment.",
      framed: "Pour votre sécurité, cette carte s’affiche uniquement sur sa propre page.", open: "Ouvrir la carte",
      scan: "Scannez pour voir la carte", table: "Table",
      tags: { V: "Végétarien", VG: "Végan", GF: "Sans gluten", spicy: "Épicé" },
      a: ["Céréales contenant du gluten", "Crustacés", "Œufs", "Poisson", "Arachides", "Soja", "Lait", "Fruits à coque", "Céleri", "Moutarde", "Sésame", "Sulfites", "Lupin", "Mollusques"]
    },
    de: {
      name: "Deutsch", menu: "Speisekarte", allergens: "Allergene", soldOut: "Ausverkauft", loading: "Speisekarte wird geladen…", retry: "Erneut versuchen",
      ask: "Allergie oder besondere Ernährung? Bitte fragen Sie unser Personal.",
      oldBrowser: "Aktualisieren Sie Ihren Browser, um diese Speisekarte zu sehen.",
      badLink: "Der Link zu dieser Speisekarte scheint beschädigt oder unvollständig zu sein. Bitte fragen Sie nach einem neuen QR-Code.",
      noMenu: "Hier gibt es noch keine Speisekarte.",
      netErr: "Die Speisekarte konnte nicht geladen werden. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
      csvErr: "Die Speisekarte konnte nicht gelesen werden. Bitte sagen Sie dem Personal Bescheid.",
      empty: "Diese Speisekarte enthält noch keine Gerichte.",
      framed: "Zu Ihrer Sicherheit wird diese Speisekarte nur auf ihrer eigenen Seite angezeigt.", open: "Speisekarte öffnen",
      scan: "Scannen für die Speisekarte", table: "Tisch",
      tags: { V: "Vegetarisch", VG: "Vegan", GF: "Glutenfrei", spicy: "Scharf" },
      a: ["Glutenhaltiges Getreide", "Krebstiere", "Eier", "Fisch", "Erdnüsse", "Soja", "Milch", "Schalenfrüchte", "Sellerie", "Senf", "Sesam", "Sulfite", "Lupine", "Weichtiere"]
    },
    pl: {
      name: "Polski", menu: "Menu", allergens: "Alergeny", soldOut: "Wyprzedane", loading: "Ładowanie menu…", retry: "Spróbuj ponownie",
      ask: "Alergia lub specjalna dieta? Zapytaj obsługę.",
      oldBrowser: "Zaktualizuj przeglądarkę, aby zobaczyć to menu.",
      badLink: "Link do tego menu wygląda na uszkodzony lub niepełny. Poproś o nowy kod QR.",
      noMenu: "Nie ma tu jeszcze menu do wyświetlenia.",
      netErr: "Nie udało się wczytać menu. Sprawdź połączenie i spróbuj ponownie.",
      csvErr: "Nie udało się odczytać menu. Powiadom obsługę.",
      empty: "W tym menu nie ma jeszcze dań.",
      framed: "Dla Twojego bezpieczeństwa to menu wyświetla się tylko na własnej stronie.", open: "Otwórz menu",
      scan: "Zeskanuj, aby zobaczyć menu", table: "Stolik",
      tags: { V: "Wegetariańskie", VG: "Wegańskie", GF: "Bez glutenu", spicy: "Ostre" },
      a: ["Zboża zawierające gluten", "Skorupiaki", "Jaja", "Ryby", "Orzeszki ziemne", "Soja", "Mleko", "Orzechy", "Seler", "Gorczyca", "Sezam", "Siarczyny", "Łubin", "Mięczaki"]
    },
    uk: {
      name: "Українська", menu: "Меню", allergens: "Алергени", soldOut: "Закінчилось", loading: "Завантаження меню…", retry: "Спробувати ще раз",
      ask: "Алергія чи особлива дієта? Запитайте наш персонал.",
      oldBrowser: "Оновіть браузер, щоб побачити це меню.",
      badLink: "Посилання на це меню виглядає пошкодженим або неповним. Попросіть новий QR-код.",
      noMenu: "Меню тут ще немає.",
      netErr: "Не вдалося завантажити меню. Перевірте з’єднання й спробуйте ще раз.",
      csvErr: "Не вдалося прочитати меню. Повідомте персонал.",
      empty: "У цьому меню ще немає страв.",
      framed: "Для вашої безпеки це меню відображається лише на власній сторінці.", open: "Відкрити меню",
      scan: "Скануйте, щоб побачити меню", table: "Столик",
      tags: { V: "Вегетаріанське", VG: "Веганське", GF: "Без глютену", spicy: "Гостре" },
      a: ["Злаки, що містять глютен", "Ракоподібні", "Яйця", "Риба", "Арахіс", "Соя", "Молоко", "Горіхи", "Селера", "Гірчиця", "Кунжут", "Сульфіти", "Люпин", "Молюски"]
    },
    ru: {
      name: "Русский", menu: "Меню", allergens: "Аллергены", soldOut: "Закончилось", loading: "Загрузка меню…", retry: "Повторить",
      ask: "Аллергия или особая диета? Спросите наш персонал.",
      oldBrowser: "Обновите браузер, чтобы увидеть это меню.",
      badLink: "Ссылка на это меню выглядит повреждённой или неполной. Попросите новый QR-код.",
      noMenu: "Меню здесь пока нет.",
      netErr: "Не удалось загрузить меню. Проверьте соединение и попробуйте ещё раз.",
      csvErr: "Не удалось прочитать меню. Сообщите персоналу.",
      empty: "В этом меню пока нет блюд.",
      framed: "Для вашей безопасности это меню показывается только на своей странице.", open: "Открыть меню",
      scan: "Сканируйте, чтобы увидеть меню", table: "Столик",
      tags: { V: "Вегетарианское", VG: "Веганское", GF: "Без глютена", spicy: "Острое" },
      a: ["Злаки, содержащие глютен", "Ракообразные", "Яйца", "Рыба", "Арахис", "Соя", "Молоко", "Орехи", "Сельдерей", "Горчица", "Кунжут", "Сульфиты", "Люпин", "Моллюски"]
    }
  };

  // ---------- Labels for the "Pay the bill" screen (PAY-1). {total}, {host}: filled in by the page. Translations are mine: native speakers should check them. ----------
  var PAY_T = {
    en: { refresh: "Refresh", payBtn: "Pay the bill", back: "Back to menu", fromBill: "Amount from your bill", enterAmt: "Enter the amount on your bill",
      bill: "Bill", tip: "Tip", total: "Total", noTip: "No tip", custom: "Custom", customLabel: "Tip amount", howH: "How to pay",
      terminalH: "Show this to your waiter", payOn: "Pay {total} on {host}", openHost: "Open {host}", copyAmount: "Copy amount", enterOn: "Enter {total} on the next page",
      blikH: "BLIK phone transfer", phone: "Phone number", amount: "Amount", ttl: "Transfer title", blikHint: "Use BLIK phone transfer in your banking app.", copy: "Copy", copied: "Copied",
      safe: "You pay on {host} or in your banking app. This page never asks for card details.", safeNo: "You pay at the cafe or in your banking app. This page never asks for card details." },
    es: { refresh: "Actualizar", payBtn: "Pagar la cuenta", back: "Volver a la carta", fromBill: "Importe de tu cuenta", enterAmt: "Introduce el importe de tu cuenta",
      bill: "Cuenta", tip: "Propina", total: "Total", noTip: "Sin propina", custom: "Otra", customLabel: "Importe de la propina", howH: "Cómo pagar",
      terminalH: "Enséñale esto al camarero", payOn: "Pagar {total} en {host}", openHost: "Abrir {host}", copyAmount: "Copiar importe", enterOn: "Introduce {total} en la página siguiente",
      blikH: "Transferencia BLIK al teléfono", phone: "Número de teléfono", amount: "Importe", ttl: "Título de la transferencia", blikHint: "Usa la transferencia BLIK al teléfono en la app de tu banco.", copy: "Copiar", copied: "Copiado",
      safe: "Pagas en {host} o en la app de tu banco. Esta página nunca pide datos de tarjeta.", safeNo: "Pagas en el local o en la app de tu banco. Esta página nunca pide datos de tarjeta." },
    pt: { refresh: "Atualizar", payBtn: "Pagar a conta", back: "Voltar ao menu", fromBill: "Valor da sua conta", enterAmt: "Introduza o valor da sua conta",
      bill: "Conta", tip: "Gorjeta", total: "Total", noTip: "Sem gorjeta", custom: "Outro valor", customLabel: "Valor da gorjeta", howH: "Como pagar",
      terminalH: "Mostre isto ao empregado", payOn: "Pagar {total} em {host}", openHost: "Abrir {host}", copyAmount: "Copiar valor", enterOn: "Introduza {total} na página seguinte",
      blikH: "Transferência BLIK por telefone", phone: "Número de telefone", amount: "Valor", ttl: "Título da transferência", blikHint: "Use a transferência BLIK por telefone na app do seu banco.", copy: "Copiar", copied: "Copiado",
      safe: "Paga em {host} ou na app do seu banco. Esta página nunca pede dados do cartão.", safeNo: "Paga no local ou na app do seu banco. Esta página nunca pede dados do cartão." },
    fr: { refresh: "Actualiser", payBtn: "Payer l’addition", back: "Retour à la carte", fromBill: "Montant de votre addition", enterAmt: "Saisissez le montant de votre addition",
      bill: "Addition", tip: "Pourboire", total: "Total", noTip: "Sans pourboire", custom: "Autre", customLabel: "Montant du pourboire", howH: "Comment payer",
      terminalH: "Montrez ceci au serveur", payOn: "Payer {total} sur {host}", openHost: "Ouvrir {host}", copyAmount: "Copier le montant", enterOn: "Saisissez {total} sur la page suivante",
      blikH: "Virement BLIK par téléphone", phone: "Numéro de téléphone", amount: "Montant", ttl: "Titre du virement", blikHint: "Utilisez le virement BLIK par téléphone dans l’application de votre banque.", copy: "Copier", copied: "Copié",
      safe: "Vous payez sur {host} ou dans l’application de votre banque. Cette page ne demande jamais de coordonnées de carte.", safeNo: "Vous payez sur place ou dans l’application de votre banque. Cette page ne demande jamais de coordonnées de carte." },
    de: { refresh: "Aktualisieren", payBtn: "Rechnung bezahlen", back: "Zurück zur Speisekarte", fromBill: "Betrag Ihrer Rechnung", enterAmt: "Geben Sie den Betrag Ihrer Rechnung ein",
      bill: "Rechnung", tip: "Trinkgeld", total: "Gesamt", noTip: "Kein Trinkgeld", custom: "Anderer Betrag", customLabel: "Trinkgeld-Betrag", howH: "So bezahlen Sie",
      terminalH: "Zeigen Sie das Ihrem Kellner", payOn: "{total} bei {host} bezahlen", openHost: "{host} öffnen", copyAmount: "Betrag kopieren", enterOn: "Geben Sie {total} auf der nächsten Seite ein",
      blikH: "BLIK-Handyüberweisung", phone: "Telefonnummer", amount: "Betrag", ttl: "Überweisungstitel", blikHint: "Nutzen Sie die BLIK-Handyüberweisung in der App Ihrer Bank.", copy: "Kopieren", copied: "Kopiert",
      safe: "Sie zahlen bei {host} oder in der App Ihrer Bank. Diese Seite fragt nie nach Kartendaten.", safeNo: "Sie zahlen vor Ort oder in der App Ihrer Bank. Diese Seite fragt nie nach Kartendaten." },
    pl: { refresh: "Odśwież", payBtn: "Zapłać rachunek", back: "Wróć do menu", fromBill: "Kwota z Twojego rachunku", enterAmt: "Wpisz kwotę z rachunku",
      bill: "Rachunek", tip: "Napiwek", total: "Razem", noTip: "Bez napiwku", custom: "Inna kwota", customLabel: "Kwota napiwku", howH: "Jak zapłacić",
      terminalH: "Pokaż to kelnerowi", payOn: "Zapłać {total} na {host}", openHost: "Otwórz {host}", copyAmount: "Kopiuj kwotę", enterOn: "Wpisz {total} na następnej stronie",
      blikH: "Przelew BLIK na telefon", phone: "Numer telefonu", amount: "Kwota", ttl: "Tytuł przelewu", blikHint: "Użyj przelewu BLIK na telefon w aplikacji swojego banku.", copy: "Kopiuj", copied: "Skopiowano",
      safe: "Płacisz na {host} lub w aplikacji swojego banku. Ta strona nigdy nie prosi o dane karty.", safeNo: "Płacisz na miejscu lub w aplikacji swojego banku. Ta strona nigdy nie prosi o dane karty." },
    uk: { refresh: "Оновити", payBtn: "Сплатити рахунок", back: "Назад до меню", fromBill: "Сума з вашого рахунку", enterAmt: "Введіть суму з вашого рахунку",
      bill: "Рахунок", tip: "Чайові", total: "Разом", noTip: "Без чайових", custom: "Інша сума", customLabel: "Сума чайових", howH: "Як сплатити",
      terminalH: "Покажіть це офіціанту", payOn: "Сплатити {total} на {host}", openHost: "Відкрити {host}", copyAmount: "Копіювати суму", enterOn: "Введіть {total} на наступній сторінці",
      blikH: "Переказ BLIK на телефон", phone: "Номер телефону", amount: "Сума", ttl: "Призначення переказу", blikHint: "Скористайтеся переказом BLIK на телефон у застосунку свого банку.", copy: "Копіювати", copied: "Скопійовано",
      safe: "Ви платите на {host} або в застосунку свого банку. Ця сторінка ніколи не просить дані картки.", safeNo: "Ви платите на місці або в застосунку свого банку. Ця сторінка ніколи не просить дані картки." },
    ru: { refresh: "Обновить", payBtn: "Оплатить счёт", back: "Назад к меню", fromBill: "Сумма из вашего счёта", enterAmt: "Введите сумму из вашего счёта",
      bill: "Счёт", tip: "Чаевые", total: "Итого", noTip: "Без чаевых", custom: "Другая сумма", customLabel: "Сумма чаевых", howH: "Как оплатить",
      terminalH: "Покажите это официанту", payOn: "Оплатить {total} на {host}", openHost: "Открыть {host}", copyAmount: "Скопировать сумму", enterOn: "Введите {total} на следующей странице",
      blikH: "Перевод BLIK на телефон", phone: "Номер телефона", amount: "Сумма", ttl: "Назначение перевода", blikHint: "Воспользуйтесь переводом BLIK на телефон в приложении своего банка.", copy: "Копировать", copied: "Скопировано",
      safe: "Вы платите на {host} или в приложении своего банка. Эта страница никогда не запрашивает данные карты.", safeNo: "Вы платите на месте или в приложении своего банка. Эта страница никогда не запрашивает данные карты." }
  };
  // PAY-2 labels (the redesigned Pay screen). Merged into PAY_T below. Translations are mine: native speakers should check them.
  var PAY_T2 = {
    en: { open: "Open table", waiter: "Waiter: {name}", tipFor: "Tip for the waiter ({name})", splitH: "How to split the bill", mWhole: "Whole bill", mItems: "My items", mSplit: "Split between people",
      people: "Number of people", splitNote: "Each share is rounded up, so the last person may pay slightly less.", ordered: "Ordered items", food: "Food and drinks", share: "Your share", toPay: "Total to pay",
      less: "Fewer", more: "More", rateH: "How was your visit?", star: "{n} of 5 stars", cmt: "Comment (optional)", cmtHint: "Your comment is added to the message to the manager.",
      gBtn: "Describe your visit on Google", mgrBtn: "Message the manager", mgrWa: "WhatsApp", mgrMail: "e-mail", rateNote: "Your rating goes only to the café, from your own app.", rated: "rating {n}/5", fbSubject: "Visit feedback" },
    es: { open: "Mesa abierta", waiter: "Camarero: {name}", tipFor: "Propina para el camarero ({name})", splitH: "Cómo dividir la cuenta", mWhole: "Toda la cuenta", mItems: "Mis platos", mSplit: "Dividir entre personas",
      people: "Número de personas", splitNote: "Cada parte se redondea hacia arriba, así que la última persona puede pagar un poco menos.", ordered: "Pedido", food: "Comida y bebidas", share: "Tu parte", toPay: "Total a pagar",
      less: "Menos", more: "Más", rateH: "¿Qué tal tu visita?", star: "{n} de 5 estrellas", cmt: "Comentario (opcional)", cmtHint: "Tu comentario se añade al mensaje para el encargado.",
      gBtn: "Cuenta tu visita en Google", mgrBtn: "Escribir al encargado", mgrWa: "WhatsApp", mgrMail: "correo", rateNote: "Tu valoración va solo al local, desde tu propia aplicación.", rated: "valoración {n}/5", fbSubject: "Opinión sobre la visita" },
    pt: { open: "Mesa aberta", waiter: "Empregado: {name}", tipFor: "Gorjeta para o empregado ({name})", splitH: "Como dividir a conta", mWhole: "Conta toda", mItems: "Os meus itens", mSplit: "Dividir por pessoas",
      people: "Número de pessoas", splitNote: "Cada parte é arredondada para cima, por isso a última pessoa pode pagar um pouco menos.", ordered: "Itens pedidos", food: "Comida e bebidas", share: "A sua parte", toPay: "Total a pagar",
      less: "Menos", more: "Mais", rateH: "Como foi a sua visita?", star: "{n} de 5 estrelas", cmt: "Comentário (opcional)", cmtHint: "O seu comentário é adicionado à mensagem para o gerente.",
      gBtn: "Descreva a visita no Google", mgrBtn: "Escrever ao gerente", mgrWa: "WhatsApp", mgrMail: "e-mail", rateNote: "A sua avaliação vai apenas para o café, a partir da sua própria app.", rated: "avaliação {n}/5", fbSubject: "Opinião sobre a visita" },
    fr: { open: "Table ouverte", waiter: "Serveur : {name}", tipFor: "Pourboire pour le serveur ({name})", splitH: "Comment partager l’addition", mWhole: "Toute l’addition", mItems: "Mes plats", mSplit: "Partager entre personnes",
      people: "Nombre de personnes", splitNote: "Chaque part est arrondie au centime supérieur, la dernière personne peut donc payer un peu moins.", ordered: "Articles commandés", food: "Plats et boissons", share: "Votre part", toPay: "Total à payer",
      less: "Moins", more: "Plus", rateH: "Comment s’est passée votre visite ?", star: "{n} étoiles sur 5", cmt: "Commentaire (facultatif)", cmtHint: "Votre commentaire est ajouté au message pour le responsable.",
      gBtn: "Décrivez votre visite sur Google", mgrBtn: "Écrire au responsable", mgrWa: "WhatsApp", mgrMail: "e-mail", rateNote: "Votre note va uniquement à l’établissement, depuis votre propre application.", rated: "note {n}/5", fbSubject: "Avis sur la visite" },
    de: { open: "Offener Tisch", waiter: "Kellner: {name}", tipFor: "Trinkgeld für den Kellner ({name})", splitH: "So teilen Sie die Rechnung", mWhole: "Ganze Rechnung", mItems: "Meine Positionen", mSplit: "Auf Personen aufteilen",
      people: "Anzahl der Personen", splitNote: "Jeder Anteil wird aufgerundet, die letzte Person zahlt daher eventuell etwas weniger.", ordered: "Bestellte Positionen", food: "Speisen und Getränke", share: "Ihr Anteil", toPay: "Gesamt zu zahlen",
      less: "Weniger", more: "Mehr", rateH: "Wie war Ihr Besuch?", star: "{n} von 5 Sternen", cmt: "Kommentar (optional)", cmtHint: "Ihr Kommentar wird der Nachricht an die Leitung hinzugefügt.",
      gBtn: "Besuch bei Google beschreiben", mgrBtn: "Der Leitung schreiben", mgrWa: "WhatsApp", mgrMail: "E-Mail", rateNote: "Ihre Bewertung geht nur an das Lokal, aus Ihrer eigenen App.", rated: "Bewertung {n}/5", fbSubject: "Feedback zum Besuch" },
    pl: { open: "Otwarty stolik", waiter: "Kelner: {name}", tipFor: "Napiwek dla kelnera ({name})", splitH: "Sposób podziału rachunku", mWhole: "Cały rachunek", mItems: "Moje pozycje", mSplit: "Podziel na osoby",
      people: "Liczba osób", splitNote: "Kwota na osobę jest zaokrąglana w górę, więc ostatnia osoba może zapłacić trochę mniej.", ordered: "Zamówione pozycje", food: "Suma dań i napojów", share: "Twoja część", toPay: "Razem do zapłaty",
      less: "Mniej", more: "Więcej", rateH: "Jak oceniasz wizytę?", star: "{n} z 5 gwiazdek", cmt: "Komentarz (opcjonalnie)", cmtHint: "Komentarz zostanie dodany do wiadomości do menadżera.",
      gBtn: "Opisz wizytę w Google", mgrBtn: "Napisz do menadżera", mgrWa: "WhatsApp", mgrMail: "e-mail", rateNote: "Twoja ocena trafia tylko do lokalu, z Twojej własnej aplikacji.", rated: "ocena {n}/5", fbSubject: "Opinia o wizycie" },
    uk: { open: "Відкритий столик", waiter: "Офіціант: {name}", tipFor: "Чайові для офіціанта ({name})", splitH: "Як розділити рахунок", mWhole: "Весь рахунок", mItems: "Мої позиції", mSplit: "Розділити між людьми",
      people: "Кількість людей", splitNote: "Кожна частка округлюється вгору, тому остання людина може заплатити трохи менше.", ordered: "Замовлені позиції", food: "Страви й напої", share: "Ваша частка", toPay: "Разом до сплати",
      less: "Менше", more: "Більше", rateH: "Як минув ваш візит?", star: "{n} з 5 зірок", cmt: "Коментар (необов’язково)", cmtHint: "Коментар буде додано до повідомлення менеджеру.",
      gBtn: "Опишіть візит у Google", mgrBtn: "Написати менеджеру", mgrWa: "WhatsApp", mgrMail: "e-mail", rateNote: "Ваша оцінка надходить лише до закладу, з вашого власного застосунку.", rated: "оцінка {n}/5", fbSubject: "Відгук про візит" },
    ru: { open: "Открытый столик", waiter: "Официант: {name}", tipFor: "Чаевые для официанта ({name})", splitH: "Как разделить счёт", mWhole: "Весь счёт", mItems: "Мои позиции", mSplit: "Разделить между людьми",
      people: "Количество человек", splitNote: "Каждая доля округляется вверх, поэтому последний человек может заплатить чуть меньше.", ordered: "Заказанные позиции", food: "Блюда и напитки", share: "Ваша доля", toPay: "Итого к оплате",
      less: "Меньше", more: "Больше", rateH: "Как прошёл ваш визит?", star: "{n} из 5 звёзд", cmt: "Комментарий (необязательно)", cmtHint: "Комментарий будет добавлен к сообщению менеджеру.",
      gBtn: "Опишите визит в Google", mgrBtn: "Написать менеджеру", mgrWa: "WhatsApp", mgrMail: "e-mail", rateNote: "Ваша оценка уходит только в заведение, из вашего собственного приложения.", rated: "оценка {n}/5", fbSubject: "Отзыв о визите" }
  };
  Object.keys(PAY_T2).forEach(function (l) { Object.keys(PAY_T2[l]).forEach(function (k) { PAY_T[l][k] = PAY_T2[l][k]; }); });
  function fill(str, vars) { return String(str).replace(/\{(\w+)\}/g, function (all, k) { return vars && vars[k] != null ? vars[k] : all; }); }

  // ---------- small helpers ----------
  function clip(v, n) { v = v == null ? "" : String(v); v = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ""); return v.length > n ? v.slice(0, n) : v; }
  function pickLang(l) {
    l = String(l || "").toLowerCase().slice(0, 2);
    return LANGS.indexOf(l) >= 0 ? l : "en";
  }
  function browserLang() {
    var nav = (typeof navigator !== "undefined") ? navigator : {};
    var list = nav.languages && nav.languages.length ? nav.languages : [nav.language || "en"];
    for (var i = 0; i < list.length; i++) { var l = String(list[i]).toLowerCase().slice(0, 2); if (LANGS.indexOf(l) >= 0) return l; }
    return "en";
  }

  // ---------- normalize: the only gate between untrusted data and the page ----------
  function normalize(raw) {
    var r = raw && typeof raw === "object" ? raw : {};
    var out = {
      v: 1,
      n: clip(r.n, LIMITS.name),
      c: clip(r.c, 12).trim(),
      l: pickLang(r.l),
      t: THEMES.indexOf(r.t) >= 0 ? r.t : "espresso",
      f: clip(r.f, LIMITS.footer),
      s: []
    };
    var pp = normalizePay(r.p);
    if (pp) out.p = pp;
    var total = 0;
    var secs = Array.isArray(r.s) ? r.s.slice(0, LIMITS.sections) : [];
    secs.forEach(function (sec) {
      if (!sec || typeof sec !== "object") return;
      var o = { t: clip(sec.t, LIMITS.title), i: [] };
      (Array.isArray(sec.i) ? sec.i : []).forEach(function (it) {
        if (!it || typeof it !== "object" || total >= LIMITS.items) return;
        var n = clip(it.n, LIMITS.name);
        if (!n.trim()) return;
        total++;
        var x = { n: n };
        if (typeof it.p === "number" && isFinite(it.p) && it.p >= 0) x.p = it.p;
        else if (typeof it.p === "string" && it.p.trim()) x.p = clip(it.p, LIMITS.priceText);
        var d = clip(it.d, LIMITS.desc);
        if (d.trim()) x.d = d;
        var a = [];
        (Array.isArray(it.a) ? it.a : []).forEach(function (k) {
          k = parseInt(k, 10);
          if (k >= 1 && k <= 14 && a.indexOf(k) < 0) a.push(k);
        });
        a.sort(function (p, q) { return p - q; });
        if (a.length) x.a = a;
        var g = [];
        (Array.isArray(it.g) ? it.g : []).forEach(function (k) { if (TAGS.indexOf(k) >= 0 && g.indexOf(k) < 0) g.push(k); });
        if (g.length) x.g = g;
        if (it.x === 1 || it.x === true || it.x === "1") x.x = 1;
        o.i.push(x);
      });
      out.s.push(o);
    });
    return out;
  }

  // ---------- link codec: base64url(deflate-raw(JSON)); "0" prefix = same JSON without compression ----------
  function bytesToB64url(bytes) {
    var s = "", CH = 0x8000;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlToBytes(str) {
    str = String(str).replace(/[^A-Za-z0-9_\-+\/]/g, "").replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function pump(bytes, ts, cap) {
    var w = ts.writable.getWriter();
    w.write(bytes).catch(function () {});
    w.close().catch(function () {});
    var rd = ts.readable.getReader(), chunks = [], total = 0;
    function step() {
      return rd.read().then(function (res) {
        if (res.done) {
          var out = new Uint8Array(total), off = 0;
          chunks.forEach(function (c) { out.set(c, off); off += c.length; });
          return out;
        }
        total += res.value.length;
        if (cap && total > cap) { try { rd.cancel(); } catch (e) { /* ignore */ } throw new Error("too big"); }
        chunks.push(res.value);
        return step();
      });
    }
    return step();
  }
  function canCompress() { try { return typeof CompressionStream === "function" && !!new CompressionStream("deflate-raw"); } catch (e) { return false; } }
  function canDecompress() { try { return typeof DecompressionStream === "function" && !!new DecompressionStream("deflate-raw"); } catch (e) { return false; } }
  function utf8Bytes(s) { return new TextEncoder().encode(s); }

  // menu object (schema keys) -> payload string ("1..." or "0..." when the browser cannot compress)
  function encodePayload(menu) {
    var raw = utf8Bytes(JSON.stringify(menu));
    if (!canCompress()) return Promise.resolve("0" + bytesToB64url(raw));
    return pump(raw, new CompressionStream("deflate-raw")).then(function (z) { return "1" + bytesToB64url(z); });
  }
  function fail(code) { var e = new Error(code); e.code = code; return e; }
  // payload string -> Promise<menu object>, rejects with .code = "old" | "bad"
  function decodePayload(payload) {
    return new Promise(function (resolve, reject) {
      var kind = payload.charAt(0), body = payload.slice(1);
      if ((kind !== "0" && kind !== "1") || !body) return reject(fail("bad"));
      var bytes;
      try { bytes = b64urlToBytes(body); } catch (e) { return reject(fail("bad")); }
      function finish(u8) {
        try {
          var obj = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(u8));
          if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw 0;
          resolve(obj);
        } catch (e) { reject(fail("bad")); }
      }
      if (kind === "0") {
        if (bytes.length > LIMITS.json) return reject(fail("bad"));
        return finish(bytes);
      }
      if (!canDecompress()) return reject(fail("old"));
      pump(bytes, new DecompressionStream("deflate-raw"), LIMITS.json).then(finish, function () { reject(fail("bad")); });
    });
  }

  // ---------- CSV (RFC 4180: quotes, commas and newlines inside quotes, "" escapes) ----------
  function parseCsv(text) {
    text = String(text == null ? "" : text).replace(/^﻿/, "");
    var rows = [], row = [], cell = "", i = 0, n = text.length, q = false;
    while (i < n) {
      var ch = text.charAt(i);
      if (q) {
        if (ch === '"') {
          if (text.charAt(i + 1) === '"') { cell += '"'; i += 2; continue; }
          q = false; i++; continue;
        }
        cell += ch; i++; continue;
      }
      if (ch === '"' && cell === "") { q = true; i++; continue; }
      if (ch === ",") { row.push(cell); cell = ""; i++; continue; }
      if (ch === "\r" || ch === "\n") {
        if (ch === "\r" && text.charAt(i + 1) === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = ""; i++; continue;
      }
      cell += ch; i++;
    }
    if (q) throw new Error("unterminated quote");
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  var LANG_NAMES = { english: "en", spanish: "es", "español": "es", espanol: "es", portuguese: "pt", "português": "pt", portugues: "pt", french: "fr", "français": "fr", francais: "fr", german: "de", deutsch: "de", polish: "pl", polski: "pl", ukrainian: "uk", "українська": "uk", russian: "ru", "русский": "ru" };
  var TAG_ALIASES = { v: "V", veg: "V", vegetarian: "V", vegetarisch: "V", vg: "VG", vegan: "VG", gf: "GF", "gluten-free": "GF", glutenfree: "GF", "gluten free": "GF", spicy: "spicy", hot: "spicy" };
  var HEAD_ALIASES = { section: "section", category: "section", item: "item", name: "item", dish: "item", price: "price", description: "description", desc: "description", allergens: "allergens", allergen: "allergens", tags: "tags", tag: "tags", diet: "tags", sold_out: "sold_out", "sold out": "sold_out", soldout: "sold_out", "sold-out": "sold_out" };
  var SET_ALIASES = { name: "name", cafe: "name", "café": "name", title: "name", currency: "currency", language: "language", lang: "language", theme: "theme", footer: "footer" };
  var SOLD_RE = /^(yes|y|true|1|x|tak|да|si|sí|oui|ja|sim)$/i;

  // A price cell: a number with "," or "." decimals, optional thousands separators, optionally with a currency sign or code before or after it
  // ("12,50 zł", "€ 4.25", "1 200 Ft", "PLN 9"). Anything else ("from 12", "2 for 5", "market price") stays as text.
  var CUR_TOKEN = /^(?:[€$£¥₴₽₺₹₸₪]|[a-z]{3}|zł|zl|kč|kc|ft|kr|грн|руб|р|лв|lei|fr|c\$|a\$|r\$|us\$)\.?$/i;
  function numOf(t) {
    var m;
    if ((m = t.match(/^([1-9]\d{0,2}(?:[ '’]\d{3})+)(?:[.,](\d{1,2}))?$/))) return parseFloat(m[1].replace(/[ '’]/g, "") + (m[2] ? "." + m[2] : ""));   // 1 200,50
    if ((m = t.match(/^([1-9]\d{0,2}(?:,\d{3})+)(?:\.(\d{1,2}))?$/))) return parseFloat(m[1].replace(/,/g, "") + (m[2] ? "." + m[2] : ""));            // 1,200.50
    if ((m = t.match(/^([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d{1,2}))?$/))) return parseFloat(m[1].replace(/\./g, "") + (m[2] ? "." + m[2] : ""));            // 1.200,50
    if ((m = t.match(/^(\d+)(?:[.,](\d{1,3}))?$/))) return parseFloat(m[1] + (m[2] ? "." + m[2] : ""));                                                  // 12  12,5  12.50  0,250
    return null;
  }
  function parsePrice(s) {
    s = String(s == null ? "" : s).replace(/[   ]/g, " ").trim();
    if (!s) return undefined;
    var m = s.match(/^(\S*?)\s*(\d[\d .,'’]*\d|\d)\s*(\S*)$/);
    if (m) {
      var pre = m[1], suf = m[3], v = numOf(m[2]);
      var okPre = !pre || CUR_TOKEN.test(pre), okSuf = !suf || CUR_TOKEN.test(suf) || /^[.,]?[-–—]?$/.test(suf);
      if (v !== null && isFinite(v) && okPre && okSuf) return v;
    }
    return clip(s, LIMITS.priceText);
  }
  function cellTags(text) {
    var g = [];
    String(text).split(/[,;\/|]+/).forEach(function (piece) {
      piece = piece.trim().toLowerCase();
      if (!piece) return;
      var t = TAG_ALIASES[piece];
      if (t) { if (g.indexOf(t) < 0) g.push(t); return; }
      piece.split(/\s+/).forEach(function (w) { var u = TAG_ALIASES[w]; if (u && g.indexOf(u) < 0) g.push(u); });   // "V GF", "vegan spicy"
    });
    return g;
  }
  function cellAllergens(text) {
    var a = [];
    String(text).split(/[,;\/.\s]+/).forEach(function (x) { if (!/^\d{1,2}$/.test(x)) return; x = parseInt(x, 10); if (x >= 1 && x <= 14 && a.indexOf(x) < 0) a.push(x); });
    return a;
  }

  // rows (arrays of cells) -> menu object (schema keys). Throws Error("csv") when no header row is found.
  // Official layout (Google Sheets template): row 1 "#settings,name,currency,language,theme,footer", row 2 the values in the same columns,
  // a blank row, then "section,item,price,description,allergens,tags,sold_out" and one item per row.
  // Also accepted: settings as vertical "key,value" rows above the header row.
  function menuFromRows(rows) {
    var settings = {}, hi = -1, i, r, payCfg = null;
    function cell0(row) { return String(row && row[0] != null ? row[0] : "").trim().toLowerCase(); }
    function isHeader(row) {   // a row naming a section column and an item column (extra columns may come before them)
      var sec = false, item = false;
      (row || []).forEach(function (h) { var a = HEAD_ALIASES[String(h).trim().toLowerCase()]; if (a === "section") sec = true; if (a === "item") item = true; });
      return sec && item;
    }
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      var k = cell0(r);
      if (isHeader(r)) { hi = i; break; }
      if (k === "#settings" || k === "settings") {
        var vals = rows[i + 1] || [];
        if (!isHeader(vals)) {
          r.forEach(function (h, idx) {
            var a = idx > 0 && SET_ALIASES[String(h).trim().toLowerCase()];
            if (a && idx < vals.length) settings[a] = String(vals[idx] == null ? "" : vals[idx]).trim();
          });
          i++;
        }
        continue;
      }
      if (k === "#pay") {   // optional payments block: header row + values row, matched by header name
        var pvals = rows[i + 1] || [];
        if (!isHeader(pvals)) i++; else pvals = [];
        payCfg = payFromCells(r, pvals);
        continue;
      }
      if (SET_ALIASES[k] && r.length > 1) settings[SET_ALIASES[k]] = String(r[1] == null ? "" : r[1]).trim();
    }
    if (hi < 0) throw new Error("csv");
    var col = {};
    rows[hi].forEach(function (h, idx) { var a = HEAD_ALIASES[String(h).trim().toLowerCase()]; if (a && !(a in col)) col[a] = idx; });
    if (!("item" in col)) throw new Error("csv");
    function cellOf(row, key) { return key in col && row[col[key]] != null ? String(row[col[key]]).trim() : ""; }

    var lc = (settings.language || "").toLowerCase();
    var lang = lc ? (LANG_NAMES[lc] || lc.slice(0, 2)) : "en";
    var theme = (settings.theme || "").toLowerCase();
    var menu = { v: 1, n: settings.name || "", c: settings.currency || "", l: pickLang(lang), t: THEMES.indexOf(theme) >= 0 ? theme : "espresso", f: settings.footer || "", s: [] };
    if (payCfg) menu.p = payCfg;
    var cur = null, byTitle = {};
    function section(title) {
      if (byTitle[title]) return byTitle[title];
      var s = { t: title, i: [] };
      byTitle[title] = s; menu.s.push(s);
      return s;
    }
    for (i = hi + 1; i < rows.length; i++) {
      r = rows[i];
      if (!r.some(function (c) { return String(c).trim() !== ""; })) continue;      // empty row
      var st = cellOf(r, "section"), name = cellOf(r, "item");
      if (st) cur = section(st);                                                    // a row with a section but no item only opens the section
      if (!name) continue;                                                          // no item name: no item
      if (!cur) cur = section("");
      var it = { n: name };
      var p = parsePrice(cellOf(r, "price")); if (p !== undefined) it.p = p;
      var d = cellOf(r, "description"); if (d) it.d = d;
      var a = cellAllergens(cellOf(r, "allergens")); if (a.length) it.a = a;
      var g = cellTags(cellOf(r, "tags")); if (g.length) it.g = g;
      if (SOLD_RE.test(cellOf(r, "sold_out"))) it.x = 1;
      cur.i.push(it);
    }
    menu.s = menu.s.filter(function (s) { return s.i.length; });                    // sections without items are dropped
    return menu;
  }
  function menuFromCsv(text) { return menuFromRows(parseCsv(text)); }

  // ---------- money ----------
  var SYMBOLS = { "zł": "PLN", "zl": "PLN", "€": "EUR", "$": "USD", "£": "GBP", "₴": "UAH", "грн": "UAH", "Kč": "CZK", "kc": "CZK", "Ft": "HUF", "₽": "RUB", "руб": "RUB", "lei": "RON", "лв": "BGN", "₺": "TRY", "C$": "CAD", "A$": "AUD", "¥": "JPY", "₹": "INR", "R$": "BRL", "Fr.": "CHF", "Fr": "CHF" };
  var SYMBOLS_LC = {}; Object.keys(SYMBOLS).forEach(function (k) { SYMBOLS_LC[k.toLowerCase()] = SYMBOLS[k]; });
  function currencyCode(c) {
    c = String(c || "").trim();
    if (!c) return "";
    var k = c.toLowerCase().replace(/\.$/, "");
    if (SYMBOLS_LC[c.toLowerCase()]) return SYMBOLS_LC[c.toLowerCase()];
    if (SYMBOLS_LC[k]) return SYMBOLS_LC[k];
    if (/^[A-Za-z]{3}$/.test(c)) return c.toUpperCase();
    return "";
  }
  // Where the currency sign goes. Suffix ("12,50 zł") for zł, Kč, Ft, kr, lei, ₴ and for € whenever the menu language is not English.
  // Prefix ("$4.50") for $, £, C$, A$, R$, ¥, ₹, CHF and for € in English. A non-breaking space joins the number and a suffix.
  var NB = "\u00a0";
  var SIGNS = { PLN: "z\u0142", CZK: "K\u010d", HUF: "Ft", SEK: "kr", NOK: "kr", DKK: "kr", RON: "lei", UAH: "\u20b4", EUR: "\u20ac", USD: "$", GBP: "\u00a3", CAD: "C$", AUD: "A$", BRL: "R$", JPY: "\u00a5", INR: "\u20b9", CHF: "CHF" };
  var SUFFIX_CODES = { PLN: 1, CZK: 1, HUF: 1, SEK: 1, NOK: 1, DKK: 1, RON: 1, UAH: 1 };
  var PREFIX_SPACE = { CHF: 1, BRL: 1 };
  // Returns {format(v)}. Whole prices everywhere -> no decimals ("9 zł"), otherwise always 2 decimals. The number follows the menu language
  // (decimal comma in every language except English).
  function priceFormatter(lang, cur, allWhole) {
    var l = pickLang(lang), loc = LOCALES[l], fd = allWhole ? 0 : 2;
    var code = currencyCode(cur);
    var nf = new Intl.NumberFormat(loc, { minimumFractionDigits: fd, maximumFractionDigits: fd });
    if (SIGNS[code]) {
      var after = !!SUFFIX_CODES[code] || (code === "EUR" && l !== "en"), sign = SIGNS[code];
      return { format: function (v) { var n = nf.format(v); return after ? n + NB + sign : sign + (PREFIX_SPACE[code] ? NB : "") + n; } };
    }
    if (code) {
      // other currencies (RUB, BGN, TRY, ...): the browser's own pattern, with the narrow sign
      try { return new Intl.NumberFormat(loc, { style: "currency", currency: code, currencyDisplay: "narrowSymbol", minimumFractionDigits: fd, maximumFractionDigits: fd }); } catch (e) { /* fall through */ }
      try { return new Intl.NumberFormat(loc, { style: "currency", currency: code, minimumFractionDigits: fd, maximumFractionDigits: fd }); } catch (e) { /* fall through */ }
    }
    return { format: function (v) { var n = nf.format(v); return cur ? (/^[\u00a3$\u20ac\u00a5]/.test(cur) ? cur + n : n + NB + cur) : n; } };
  }

  // ---------- payments (PAY-1) ----------
  // No money passes through us. The page only shows amounts and sends the guest to the cafe's OWN way of paying (a payment link, a card
  // terminal at the table, a BLIK phone number). It never asks for card data, never stores an amount and has no analytics.
  var PAY_LIMITS = { link: 300, note: 200, tips: 4, tipMin: 1, tipMax: 50 };
  var DEFAULT_TIPS = [10, 15, 20];
  var DEFAULT_BILLS = "Bill feed";   // the mini-POS feed: table,item,qty,price,waiter
  var LEGACY_BILLS = "Bills";         // PAY-1 tab: table,amount (still read as a fallback)
  var YES_RE = /^(yes|y|true|1|tak|да|si|sí|oui|ja|sim)$/i;
  var MINOR0 = { JPY: 1, HUF: 1 };   // currencies shown without decimals; everything else has 2
  function minorDigits(cur) { return MINOR0[currencyCode(cur)] ? 0 : 2; }
  function toMinor(v, d) { return Math.round(parseFloat((v * Math.pow(10, d)).toPrecision(12))); }
  function moneyFormatter(lang, cur) { return priceFormatter(lang, cur, minorDigits(cur) === 0); }

  // up to 4 integers from 1 to 50 ("10, 15, 20", "10%", [10, 15]); anything else is dropped; sorted ascending
  function parseTips(v) {
    var parts = Array.isArray(v) ? v : String(v == null ? "" : v).split(/[,;\/\s]+/), out = [];
    for (var i = 0; i < parts.length && out.length < PAY_LIMITS.tips; i++) {
      var t = String(parts[i]).trim().replace(/%$/, "");
      if (!/^\d{1,2}$/.test(t)) continue;
      var n = parseInt(t, 10);
      if (n < PAY_LIMITS.tipMin || n > PAY_LIMITS.tipMax || out.indexOf(n) >= 0) continue;
      out.push(n);
    }
    return out.sort(function (a, b) { return a - b; });
  }

  // The cafe's contact e-mail for the manager message: one plain address, no display name, no list.
  function checkEmail(text) {
    var s = String(text == null ? "" : text).trim();
    if (!s) return { ok: false, reason: "empty" };
    if (s.length > 100 || !/^[A-Za-z0-9._%+\-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?\.)+(?:[A-Za-z]{2,}|xn--[A-Za-z0-9\-]*[A-Za-z0-9])$/.test(s) || /\.\./.test(s)) return { ok: false, reason: "invalid" };
    return { ok: true, value: s };
  }
  // The cafe's payment link (also used for the Google review link). https only; no user:pass@, no port, no IP address, no javascript: or data:, at most 300 characters.
  // -> {ok:true, url, host} | {ok:false, reason: empty|long|invalid|http|scheme|credentials|port|host}
  function checkPayLink(text) {
    var s = String(text == null ? "" : text).trim();
    if (!s) return { ok: false, reason: "empty" };
    if (s.length > PAY_LIMITS.link) return { ok: false, reason: "long" };
    var m = s.match(/^([A-Za-z][A-Za-z0-9+.\-]*):/);
    if (m) {
      var sch = m[1].toLowerCase();
      if (sch === "http") return { ok: false, reason: "http" };
      if (sch !== "https") return { ok: false, reason: "scheme" };
    } else if (/^[a-z0-9][a-z0-9.\-]*\.[a-z]{2,}(\/|$)/i.test(s)) return { ok: false, reason: "http" };   // "paypal.me/name": no https://
    else return { ok: false, reason: "invalid" };
    if (/[\u0000- \u007f-\u009f\\]/.test(s)) return { ok: false, reason: "invalid" };
    var u;
    try { u = new URL(s); } catch (e) { return { ok: false, reason: "invalid" }; }
    if (u.protocol !== "https:") return { ok: false, reason: "scheme" };
    if (u.username || u.password || /^https:\/\/[^\/?#]*@/i.test(s)) return { ok: false, reason: "credentials" };
    if (u.port) return { ok: false, reason: "port" };
    var host = u.hostname;
    if (!host || host.indexOf(".") < 0 || host.charAt(0) === "[" || /^[0-9.]+$/.test(host)) return { ok: false, reason: "host" };
    return { ok: true, url: s, host: host };
  }
  // BLIK phone number: only +, digits and spaces (the + only first); 9 to 15 digits. -> {ok:true, value} | {ok:false, reason: empty|chars|digits}
  function checkBlik(text) {
    var s = String(text == null ? "" : text).replace(/[  ]/g, " ").trim();
    if (!s) return { ok: false, reason: "empty" };
    if (!/^\+?[0-9 ]+$/.test(s)) return { ok: false, reason: "chars" };
    var n = s.replace(/\D/g, "").length;
    if (n < 9 || n > 15) return { ok: false, reason: "digits" };
    return { ok: true, value: s.replace(/ {2,}/g, " ") };
  }
  // The payment config of a menu. f = {e, t, x, l, b, n, r, w, m} (raw values). Never throws.
  // r = Google review link (https), w = WhatsApp number of the manager, m = e-mail of the manager. Invalid values are dropped and named in .bad
  // ("link" | "blik" | "review" | "whatsapp" | "email").
  function buildPay(f) {
    var p = { e: f.e ? 1 : 0, t: f.t === undefined ? DEFAULT_TIPS.slice() : parseTips(f.t), x: f.x ? 1 : 0, l: "", b: "", n: clip(f.n, PAY_LIMITS.note).trim() }, bad = [];
    var ls = String(f.l == null ? "" : f.l).trim();
    if (ls) { if (checkPayLink(ls).ok) p.l = ls; else bad.push("link"); }
    var bs = String(f.b == null ? "" : f.b).trim();
    if (bs) { var cb = checkBlik(bs); if (cb.ok) p.b = cb.value; else bad.push("blik"); }
    var rs = String(f.r == null ? "" : f.r).trim();
    if (rs) { if (checkPayLink(rs).ok) p.r = rs; else bad.push("review"); }
    var ws = String(f.w == null ? "" : f.w).trim();
    if (ws) { var cw = checkBlik(ws); if (cw.ok) p.w = cw.value; else bad.push("whatsapp"); }
    var ms = String(f.m == null ? "" : f.m).trim();
    if (ms) { var cm = checkEmail(ms); if (cm.ok) p.m = cm.value; else bad.push("email"); }
    if (bad.length) p.bad = bad;
    return p;
  }
  var BAD_KEYS = ["link", "blik", "review", "whatsapp", "email"];
  function normalizePay(r) {
    if (!r || typeof r !== "object" || Array.isArray(r)) return null;
    var yes = function (v) { return v === 1 || v === true || v === "1"; };
    var p = buildPay({ e: yes(r.e), t: "t" in r ? r.t : undefined, x: yes(r.x), l: r.l, b: r.b, n: r.n, r: r.r, w: r.w, m: r.m });
    // what an earlier pass already dropped as invalid stays named (the sheet is read, normalized, shown and reported to the builder: that is normalize() more than once)
    if (Array.isArray(r.bad)) r.bad.forEach(function (k) { if (BAD_KEYS.indexOf(k) >= 0 && (!p.bad || p.bad.indexOf(k) < 0)) (p.bad = p.bad || []).push(k); });
    return p;
  }
  // the guest sees the start screen and the Pay screen only when pay is on AND at least one way of paying is valid
  function payActive(m) { return !!(m && m.p && m.p.e === 1 && (m.p.x === 1 || m.p.l || m.p.b)); }

  var PAY_ALIASES = { enabled: "enabled", enable: "enabled", on: "enabled", tips: "tips", tip: "tips", terminal: "terminal", card: "terminal", link: "link", url: "link", blik: "blik", phone: "blik", note: "note", notes: "note",
    review_link: "review", "review link": "review", review: "review", google_review: "review", feedback_whatsapp: "whatsapp", "feedback whatsapp": "whatsapp", whatsapp: "whatsapp", feedback_email: "email", "feedback email": "email", email: "email" };
  // "#pay" header row + the values row under it (matched by header name, column A is the marker)
  function payFromCells(head, vals) {
    var c = {};
    (head || []).forEach(function (h, i) { var a = i > 0 && PAY_ALIASES[String(h).trim().toLowerCase()]; if (a && !(a in c)) c[a] = String(vals && vals[i] != null ? vals[i] : "").trim(); });
    return buildPay({ e: YES_RE.test(c.enabled || ""), t: "tips" in c ? c.tips : undefined, x: YES_RE.test(c.terminal || ""), l: c.link, b: c.blik, n: c.note, r: c.review, w: c.whatsapp, m: c.email });
  }

  // An amount typed by a guest or written in the Bills tab: "48,50", "48.5", "1 200,00", "48,50 zł". -> number >= 0 or null
  function parseAmount(text) {
    var s = String(text == null ? "" : text).replace(/[\s  ]+/g, " ").trim();
    if (!s) return null;
    var v = parsePrice(s);
    return typeof v === "number" && isFinite(v) && v >= 0 && v <= 10000000 ? v : null;
  }
  // The Bills tab: first row must be exactly table,amount (gviz returns the FIRST tab when the named tab does not exist, so anything else is ignored).
  // -> {tableNumber: amount} (last row of a table wins; amounts must be > 0) or null
  function billsFromRows(rows) {
    var i = 0, blank = function (c) { return String(c == null ? "" : c).trim() === ""; };
    while (i < rows.length && rows[i].every(blank)) i++;
    var h = rows[i];
    if (!h || String(h[0] == null ? "" : h[0]).trim().toLowerCase() !== "table" || String(h[1] == null ? "" : h[1]).trim().toLowerCase() !== "amount") return null;
    for (var k = 2; k < h.length; k++) if (!blank(h[k])) return null;
    var out = {};
    for (i++; i < rows.length; i++) {
      var r = rows[i], m = String(r[0] == null ? "" : r[0]).trim().match(/^(\d{1,3})(?:[.,]0+)?$/);
      if (!m) continue;
      var n = parseInt(m[1], 10), a = parseAmount(r[1]);
      if (n < 1 || n > 999 || a === null || a <= 0) continue;
      out[n] = a;
    }
    return out;
  }
  // CSV text of the Bills tab + table number -> amount or null
  function billFor(csvText, table) {
    var b; try { b = billsFromRows(parseCsv(csvText)); } catch (e) { return null; }
    return b && Object.prototype.hasOwnProperty.call(b, table) ? b[table] : null;
  }

  // The bill feed (PAY-2): header table,item,qty,price,waiter (extra or empty columns allowed), one row per ordered item. Everything is text.
  // price is the UNIT price, qty empty = 1, prices may use a decimal comma and thousands spaces. The waiter of a table is the last non-empty waiter on its rows;
  // an empty waiter means no name is shown anywhere. Rows that do not make sense (no table number, no item, no price, qty 0) are skipped.
  // -> {tableNumber: {w, lines: [{n, q, u}]}} or null when the first row is not such a header (gviz hands back the FIRST tab when the named tab does not exist)
  var FEED_ALIASES = { table: "table", item: "item", name: "item", dish: "item", qty: "qty", quantity: "qty", price: "price", waiter: "waiter", server: "waiter" };
  var FEED_LIMITS = { lines: 200, rows: 5000, name: 80, waiter: 40, qty: 99 };
  function feedFromRows(rows) {
    var i = 0, blank = function (c) { return String(c == null ? "" : c).trim() === ""; };
    while (i < rows.length && rows[i].every(blank)) i++;
    var h = rows[i];
    if (!h) return null;
    var col = {};
    h.forEach(function (c, k) { var a = FEED_ALIASES[String(c == null ? "" : c).trim().toLowerCase()]; if (a && !(a in col)) col[a] = k; });
    if (!("table" in col) || !("item" in col) || !("price" in col)) return null;
    var out = {}, seen = 0;
    for (i++; i < rows.length && seen < FEED_LIMITS.rows; i++) {
      seen++;
      var r = rows[i];
      var cell = function (k) { return k in col && r[col[k]] != null ? String(r[col[k]]).trim() : ""; };
      var tm = cell("table").match(/^(\d{1,3})(?:[.,]0+)?$/);
      if (!tm) continue;
      var n = parseInt(tm[1], 10);
      if (n < 1 || n > 999) continue;
      var name = clip(cell("item"), FEED_LIMITS.name).trim();
      if (!name) continue;
      var price = parseAmount(cell("price"));
      if (price === null) continue;
      var q = 1, qs = cell("qty");
      if (qs !== "") {
        var qm = qs.match(/^(\d{1,3})(?:[.,]0+)?$/);
        if (!qm) continue;
        q = parseInt(qm[1], 10);
        if (q < 1 || q > FEED_LIMITS.qty) continue;
      }
      var t = Object.prototype.hasOwnProperty.call(out, n) ? out[n] : (out[n] = { w: "", lines: [] });
      var w = clip(cell("waiter"), FEED_LIMITS.waiter).replace(/\s+/g, " ").trim();
      if (w) t.w = w;
      if (t.lines.length < FEED_LIMITS.lines) t.lines.push({ n: name, q: q, u: price });
    }
    return out;
  }
  // CSV text of a bills tab -> {kind: "feed", tables} | {kind: "legacy", tables: {n: amount}} | null (not a bills tab at all)
  function parseBills(text) {
    var rows; try { rows = parseCsv(text); } catch (e) { return null; }
    var f = feedFromRows(rows);
    if (f) return { kind: "feed", tables: f };
    var l = billsFromRows(rows);
    return l ? { kind: "legacy", tables: l } : null;
  }
  // parsed bills + table -> {w, lines, amount?} | null. A feed bill has lines; an old Bills-tab bill has only an amount.
  function pickBill(parsed, table) {
    if (!parsed || !table || !Object.prototype.hasOwnProperty.call(parsed.tables, table)) return null;
    var t = parsed.tables[table];
    return parsed.kind === "feed" ? (t.lines.length ? { w: t.w, lines: t.lines } : null) : { w: "", lines: [], amount: t };
  }

  // Splitting. All in minor units (integers).
  // n people share a total: everybody pays the same, rounded UP to the minor unit (the last person may pay a little less)
  function splitShare(totalMinor, n) {
    n = Math.max(1, Math.min(20, Math.round(n) || 1));
    return Math.floor((Math.max(0, Math.round(totalMinor || 0)) + n - 1) / n);
  }
  // lines [{n, q, u}] (u = unit price as a number) -> [{n, q, u, sum}] in minor units
  function prepLines(lines, d) {
    return lines.map(function (l) { var u = toMinor(l.u, d); return { n: l.n, q: l.q, u: u, sum: u * l.q }; });
  }
  function linesTotal(pl) { return pl.reduce(function (a, l) { return a + l.sum; }, 0); }
  // sel[i] = how many units of line i the guest takes (0..q)
  function selTotal(pl, sel) { return pl.reduce(function (a, l, i) { return a + l.u * Math.max(0, Math.min(l.q, sel[i] | 0)); }, 0); }

  // Feedback. The message goes to the cafe's own WhatsApp or e-mail, written by the guest in the guest's own app. Nothing is sent by this page.
  function feedbackText(L, P, tb, rating, comment) {
    var parts = [];
    if (tb) parts.push(L.table + " " + tb);
    if (rating >= 1 && rating <= 5) parts.push(fill(P.rated, { n: rating }));
    var c = String(comment == null ? "" : comment).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
    if (c) parts.push(c);
    return parts.join(" \u00b7 ");
  }
  function waUrl(number, text) {
    var dg = String(number == null ? "" : number).replace(/\D/g, "").replace(/^00/, "");
    return "https://wa.me/" + dg + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function mailUrl(addr, subject, body) {
    return "mailto:" + addr + "?subject=" + encodeURIComponent(subject) + (body ? "&body=" + encodeURIComponent(body) : "");
  }

  // Tip in minor units, half up: bill 10.05 at 15% -> 1.51. Integer arithmetic only.
  function tipMinor(billMinor, pct) { return Math.floor((2 * billMinor * pct + 100) / 200); }
  // tip = {kind:"none"} | {kind:"pct", pct} | {kind:"custom", minor}; -> {bill, tip, total} in minor units
  function payTotals(billMinor, tip) {
    var b = Math.max(0, Math.round(billMinor || 0)), t = 0;
    if (tip && tip.kind === "pct") t = tipMinor(b, tip.pct);
    else if (tip && tip.kind === "custom") t = Math.max(0, Math.round(tip.minor || 0));
    return { bill: b, tip: t, total: b + t };
  }
  // "12.50" / "12,50" / "9": plain number for a banking app or a payment page
  function plainAmount(minor, d, comma) {
    var s = (minor / Math.pow(10, d)).toFixed(d);
    return comma ? s.replace(".", ",") : s;
  }
  var PP_CODES = { "zł": "PLN", "zl": "PLN", "€": "EUR", "$": "USD", "£": "GBP", "kč": "CZK", "kc": "CZK", "ft": "HUF", "chf": "CHF", "kr": "SEK", "₴": "UAH" };
  // currency of the menu -> the code PayPal expects ("" when it cannot be mapped: then only the amount is sent)
  function paypalCode(cur) {
    var c = String(cur == null ? "" : cur).trim();
    if (PP_CODES[c.toLowerCase()]) return PP_CODES[c.toLowerCase()];
    return /^[A-Za-z]{3}$/.test(c) && c.toLowerCase() !== "lei" ? c.toUpperCase() : "";   // an ISO code written as such ("lei" is a sign, not a code)
  }
  // paypal.me/Name (the username only) -> paypal.me/Name/25.50EUR. A link that already has an amount (or anything else) is returned unchanged.
  function isPayPalName(url) {
    var u; try { u = new URL(url); } catch (e) { return false; }
    if (u.hostname !== "paypal.me" && u.hostname !== "www.paypal.me") return false;
    var segs = u.pathname.split("/").filter(Boolean);
    return segs.length === 1 && /^[A-Za-z0-9._\-]+$/.test(segs[0]);
  }
  function paypalUrl(url, totalMinor, d, code) {
    if (!isPayPalName(url) || !(totalMinor > 0)) return url;
    var u = new URL(url), name = u.pathname.split("/").filter(Boolean)[0], f = Math.pow(10, d);
    var amt = d && totalMinor % f !== 0 ? (totalMinor / f).toFixed(d) : String(Math.round(totalMinor / f));
    u.pathname = "/" + name + "/" + amt + (code || "");
    return u.href;
  }

  // ---------- rendering ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function allWhole(menu) {
    var any = false;
    for (var i = 0; i < menu.s.length; i++) for (var j = 0; j < menu.s[i].i.length; j++) {
      var p = menu.s[i].i[j].p;
      if (typeof p === "number") { any = true; if (Math.round(p * 100) % 100 !== 0) return false; }
    }
    return any;
  }

  function setMeta(m, L, title) {
    var de = document.documentElement;
    de.setAttribute("data-theme", m.t);
    de.setAttribute("lang", m.l);
    document.title = (m.n ? m.n + " · " : "") + (title || L.menu);
    var tc = document.querySelector('meta[name="theme-color"]');
    if (tc) tc.setAttribute("content", THEME_COLORS[m.t]);
  }

  // Render a (raw or normalized) menu into root. Returns the normalized menu.
  // opts (all optional): view "menu" (default) | "start" | "pay" (the last two only when payments are on and usable), tb table number,
  // bills function returning a Promise of the amount for this table, nav true on the real page (history entries).
  function render(root, raw, opts) {
    var m = normalize(raw), L = T[m.l];
    opts = opts || {};
    var view = opts.view === "start" || opts.view === "pay" ? opts.view : "menu";
    if (!payActive(m)) view = "menu";
    last = { root: root, m: m, opts: opts, view: view };
    setMeta(m, L, view === "pay" ? PAY_T[m.l].payBtn : "");
    root.textContent = "";
    root.removeAttribute("aria-busy");
    if (scrollOff) { scrollOff(); scrollOff = null; }
    if (view === "start") renderStart(root, m, L, opts);
    else if (view === "pay") renderPay(root, m, L, opts);
    else renderMenu(root, m, L, opts);
    return m;
  }

  function renderMenu(root, m, L, opts) {
    var fmt = priceFormatter(m.l, m.c, allWhole(m));

    var head = el("header", "mn-head"), hl = el("div", "mn-hl");
    hl.appendChild(el("p", "mn-kicker", L.menu));
    hl.appendChild(el("h1", "mn-title", m.n || L.menu));
    head.appendChild(hl); head.appendChild(tile());
    root.appendChild(head);

    var sections = m.s.filter(function (s) { return s.i.length; });
    var used = {};
    var chipBox = null, chips = [], secEls = [];

    if (sections.length > 1) {
      var nav = el("nav", "mn-nav");
      nav.setAttribute("aria-label", L.menu);
      chipBox = el("div", "mn-chips");
      nav.appendChild(chipBox);
      root.appendChild(nav);
    }

    var main = el("main", "mn-main");
    if (!sections.length) main.appendChild(el("p", "mn-empty", L.empty));

    sections.forEach(function (sec, si) {
      var id = "sec-" + si;
      var s = el("section", "mn-sec"); s.id = id;
      if (sec.t) { var h = el("h2", "mn-sh", sec.t); h.id = id + "-h"; s.setAttribute("aria-labelledby", h.id); s.appendChild(h); }
      var ul = el("ul", "mn-list");
      sec.i.forEach(function (it) {
        var li = el("li", "mn-item" + (it.x ? " is-sold" : ""));
        li.setAttribute("data-name", it.n);
        if (typeof it.p === "number") li.setAttribute("data-price", String(it.p));
        if (it.a) li.setAttribute("data-allergens", it.a.join(","));
        if (it.x) li.setAttribute("data-sold", "1");
        var row = el("div", "mn-row");
        row.appendChild(el("h3", "mn-iname", it.n));
        if (it.p !== undefined) {
          var pr = el("span", "mn-price", typeof it.p === "number" ? fmt.format(it.p) : it.p);
          row.appendChild(pr);
        }
        li.appendChild(row);
        if (it.d) li.appendChild(el("p", "mn-desc", it.d));
        var meta = el("div", "mn-meta");
        if (it.a) {
          var al = el("span", "mn-al");
          al.setAttribute("role", "img");
          al.setAttribute("aria-label", L.allergens + ": " + it.a.map(function (k) { return k + " " + L.a[k - 1]; }).join(", "));
          it.a.forEach(function (k) { used[k] = 1; var b = el("span", "mn-num", String(k)); b.setAttribute("aria-hidden", "true"); al.appendChild(b); });
          meta.appendChild(al);
        }
        (it.g || []).forEach(function (g) { var t = el("span", "mn-tag", L.tags[g]); t.setAttribute("data-tag", g); meta.appendChild(t); });
        if (it.x) meta.appendChild(el("span", "mn-sold", L.soldOut));
        if (meta.childNodes.length) li.appendChild(meta);
        ul.appendChild(li);
      });
      s.appendChild(ul);
      main.appendChild(s);
      secEls.push(s);

      if (chipBox) {
        var chip = el("button", "mn-chip", sec.t || String(si + 1));
        chip.type = "button";
        chip.addEventListener("click", function () {
          var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
          s.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        });
        chipBox.appendChild(chip); chips.push(chip);
      }
    });
    root.appendChild(main);

    var usedNums = Object.keys(used).map(Number).sort(function (a, b) { return a - b; });
    if (usedNums.length) {
      var lg = el("section", "mn-legend");
      lg.appendChild(el("h2", "mn-lh", L.allergens));
      var ol = el("ul", "mn-ll");
      usedNums.forEach(function (k) {
        var li = el("li", "mn-lli");
        li.appendChild(el("span", "mn-num", String(k)));
        li.appendChild(el("span", "mn-lname", L.a[k - 1]));
        ol.appendChild(li);
      });
      lg.appendChild(ol);
      lg.appendChild(el("p", "mn-ask", L.ask));
      root.appendChild(lg);
    }

    if (payActive(m)) {   // a small button that stays at the bottom of the screen while the guest reads the menu
      var dock = el("div", "mn-paydock"), pb = el("button", "mn-paybtn", PAY_T[m.l].payBtn);
      pb.type = "button";
      pb.addEventListener("click", function () { setView("pay"); });
      dock.appendChild(pb); root.appendChild(dock);
    }

    var foot = el("footer", "mn-foot");
    if (m.f) foot.appendChild(el("p", "mn-ft", m.f));
    var a = el("a", "mn-brand", "Free QR menu by DoughMath Studio");
    a.href = HOME; a.rel = "noopener";
    foot.appendChild(a);
    root.appendChild(foot);

    if (chips.length) trackChips(chipBox, chips, secEls);
  }

  // ---------- start screen and Pay screen (PAY-1) ----------
  var last = null;   // the last render: {root, m, opts, view}; setView() re-renders it
  function currencySign(cur) { var code = currencyCode(cur); return SIGNS[code] || String(cur || ""); }
  function brandFooter() {
    var foot = el("footer", "mn-foot");
    var a = el("a", "mn-brand", "Free QR menu by DoughMath Studio");
    a.href = HOME; a.rel = "noopener"; foot.appendChild(a);
    return foot;
  }
  // view: "start" | "menu" | "pay". The real page (opts.nav) also gets a browser-history entry, so the phone's Back button works.
  function setView(view, fromHistory) {
    if (!last) return;
    var o = last.opts; o.view = view;
    render(last.root, last.m, o);
    if (o.nav && !fromHistory) { try { global.history.pushState({ dmView: last.view }, "", global.location.href); } catch (e) { /* no history API: fine */ } }
    try { global.scrollTo(0, 0); } catch (e) { /* ignore */ }
    if (typeof o.onView === "function") { try { o.onView(last.view); } catch (e) { /* the builder's preview switch: nothing to do if it is gone */ } }
  }
  function copyText(text, btn, P, src) {
    var label = btn.textContent;
    function ok() { btn.textContent = P.copied; btn.classList.add("done"); setTimeout(function () { btn.textContent = label; btn.classList.remove("done"); }, 1600); }
    function fallback() {
      var done = false, ta = document.createElement("input");
      ta.type = "text"; ta.value = text; ta.readOnly = true; ta.className = "mn-offscreen"; ta.setAttribute("aria-hidden", "true"); ta.tabIndex = -1;
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) { /* ignore */ }
      try { done = document.execCommand("copy"); } catch (e) { done = false; }
      ta.remove();
      if (!done && src) {   // last resort: leave the visible text selected so the guest can copy it by hand
        try { var r = document.createRange(); r.selectNodeContents(src); var sel = global.getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (e) { /* ignore */ }
      }
      if (done) ok();
    }
    if (global.navigator && navigator.clipboard && typeof navigator.clipboard.writeText === "function") navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }
  function copyBtn(label, text, P, src, aria) {
    var b = el("button", "mn-copy", label); b.type = "button";
    if (aria) b.setAttribute("aria-label", label + ": " + aria);
    b.addEventListener("click", function () { copyText(text, b, P, src); });
    return b;
  }

  // ---------- icons: inline SVG drawn with currentColor (no files, no emoji) ----------
  var SVGNS = "http://www.w3.org/2000/svg";
  var ICONS = {
    pin: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z|M12 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z",
    dish: "M3.5 12.5h17a8.5 8.5 0 01-8.5 7.5 8.5 8.5 0 01-8.5-7.5z|M8 9.5c-.9-1.2.9-1.8 0-3.2|M12 9.5c-.9-1.2.9-1.8 0-3.2|M16 9.5c-.9-1.2.9-1.8 0-3.2|M8.5 20.5h7",
    person: "M12 12a4 4 0 100-8 4 4 0 000 8z|M4.5 20.5c.6-3.6 3.6-5.5 7.5-5.5s6.9 1.9 7.5 5.5",
    card: "M3.5 6.5h17v11h-17z|M3.5 10.5h17|M6.5 14.5h4",
    link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1|M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
    phone: "M8 3.5h8a1.5 1.5 0 011.5 1.5v14a1.5 1.5 0 01-1.5 1.5H8A1.5 1.5 0 016.5 19V5A1.5 1.5 0 018 3.5z|M11 17.5h2",
    fork: "M6 3v7a2 2 0 004 0V3|M8 12v9|M17 21V3c-2.6 1.6-3.5 4.6-3.5 8H17",
    receipt: "M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3z|M9 8h6|M9 12h6",
    check: "M5 12.5l4.5 4.5L19 7.5",
    minus: "M6 12h12",
    plus: "M6 12h12|M12 6v12",
    refresh: "M20 11a8 8 0 00-14.3-4.3L4 8.5|M4 4v4.5h4.5|M4 13a8 8 0 0014.3 4.3l1.7-1.8|M20 20v-4.5h-4.5",
    star: "M12 3.5l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.9l6.1-.8z",
    go: "M5 12h14|M13 6l6 6-6 6",
    back: "M19 12H5|M11 18l-6-6 6-6",
    ext: "M14 4h6v6|M20 4l-9 9|M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5",
    chat: "M4.5 5.5h15a1 1 0 011 1v9a1 1 0 01-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 01-1-1v-9a1 1 0 011-1z",
    mail: "M3.5 6.5h17v11h-17z|M3.5 7l8.5 6.5L20.5 7"
  };
  function icon(name, cls) {
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "pc-i" + (cls ? " " + cls : "")); s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
    ICONS[name].split("|").forEach(function (dd) { var pa = document.createElementNS(SVGNS, "path"); pa.setAttribute("d", dd); s.appendChild(pa); });
    return s;
  }
  function tile() { var t = el("div", "mn-tile"); t.setAttribute("aria-hidden", "true"); t.appendChild(icon("dish")); return t; }
  function withIcon(node, name, cls, after) { if (after) node.appendChild(icon(name, cls)); else node.insertBefore(icon(name, cls), node.firstChild); return node; }

  function renderStart(root, m, L, opts) {
    var P = PAY_T[m.l];
    var head = el("header", "mn-head"), hl = el("div", "mn-hl");
    hl.appendChild(el("h1", "mn-title", m.n || L.menu));
    if (opts.tb) hl.appendChild(withIcon(el("p", "mn-table", L.table + " " + opts.tb), "pin"));
    head.appendChild(hl); head.appendChild(tile());
    root.appendChild(head);
    var main = el("main", "mn-start");
    function big(cls, ic, label, view) {
      var b = el("button", "mn-big " + cls); b.type = "button";
      b.appendChild(icon(ic, "pc-bigi")); b.appendChild(el("span", "pc-bigt", label)); b.appendChild(icon("go", "pc-go"));
      b.addEventListener("click", function () { setView(view); });
      return b;
    }
    main.appendChild(big("mn-big-menu", "fork", L.menu, "menu"));
    main.appendChild(big("mn-big-pay", "receipt", P.payBtn, "pay"));
    root.appendChild(main);
    root.appendChild(brandFooter());
  }

  // A round -/+ stepper. get/set work on a number, show(v) is the text between the buttons.
  function stepper(min, max, get, set, show, P) {
    var box = el("div", "pc-step"), less = el("button", "pc-sb"), val = el("span", "pc-sv"), more = el("button", "pc-sb");
    less.type = "button"; more.type = "button"; less.setAttribute("aria-label", P.less); more.setAttribute("aria-label", P.more);
    less.appendChild(icon("minus")); more.appendChild(icon("plus"));
    val.setAttribute("aria-live", "polite");
    less.addEventListener("click", function () { var v = get(); if (v > min) set(v - 1); });
    more.addEventListener("click", function () { var v = get(); if (v < max) set(v + 1); });
    box.appendChild(less); box.appendChild(val); box.appendChild(more);
    box.paint = function () { var v = get(); val.textContent = show(v); less.disabled = v <= min; more.disabled = v >= max; };
    return box;
  }

  // The Pay screen. Everything is built once and then updated in place, so typing and tapping never lose focus.
  // State (opts.state) lives in memory only; nothing is stored and nothing is sent anywhere.
  function renderPay(root, m, L, opts) {
    var P = PAY_T[m.l], p = m.p, d = minorDigits(m.c), F = Math.pow(10, d), fmt = moneyFormatter(m.l, m.c), comma = m.l !== "en";
    var chk = p.l ? checkPayLink(p.l) : { ok: false }, host = chk.ok ? chk.host : "";
    var S = opts.state || (opts.state = { mode: "whole", n: 2, sel: [], sig: "", data: null, from: null, bill: "", touched: false, tip: { kind: "none" }, custom: "", rate: 0, cmt: "", seq: 0 });
    var canLookUp = typeof opts.bills === "function" && !!opts.tb;
    var pl = null, built = "";   // pl: lines of the open bill in minor units; built: which layout the bill cards have
    function money(minor) { return fmt.format(minor / F); }
    function setLines() {
      var b = S.data, lines = b && b.lines && b.lines.length ? b.lines : null;
      pl = lines ? prepLines(lines, d) : null;
      var sig = pl ? pl.map(function (l) { return l.n + "|" + l.q + "|" + l.u; }).join("\n") : "";
      if (sig !== S.sig) { S.sig = sig; S.sel = pl ? pl.map(function () { return 0; }) : []; }
      if (!pl && S.mode === "items") S.mode = "whole";
    }
    setLines();
    if (S.from !== null && !S.touched && !S.bill) S.bill = plainAmount(toMinor(S.from, d), d, comma);

    var main = el("main", "mn-pay");
    var back = withIcon(el("button", "mn-back", P.back), "back"); back.type = "button";
    back.addEventListener("click", function () { setView("menu"); });
    main.appendChild(back);

    // header card: cafe, table, waiter (only when the sheet has one), "open table" when the bill has items
    var top = el("header", "pc-card pc-top"), trow = el("div", "pc-toprow"), tl = el("div", "pc-tl");
    var chipOpen = el("p", "pc-open"); chipOpen.appendChild(el("span", "pc-dot")); chipOpen.appendChild(el("span", null, P.open));
    tl.appendChild(chipOpen);
    tl.appendChild(el("h1", "pc-name", m.n || L.menu));
    var meta = el("ul", "pc-meta");
    if (opts.tb) meta.appendChild(withIcon(el("li", "pc-tb", L.table + " " + opts.tb), "pin"));
    var liW = el("li", "pc-wt"), wTxt = el("span"); liW.appendChild(wTxt); meta.appendChild(liW);
    tl.appendChild(meta); trow.appendChild(tl); trow.appendChild(tile()); top.appendChild(trow); main.appendChild(top);

    // bill cards (split mode, items or amount): built by buildBill()
    var billBox = el("div", "pc-billbox"); main.appendChild(billBox);
    var segBtns = [], peopleBox, peopleStep, noteEl, itemsCard, cnt, lineEls = [], amtInp, fromLab, splitCard;

    // tip card
    var tcard = el("section", "pc-card pc-tipcard"), thead = el("div", "pc-tiphead");
    var tipH = el("h2", "pc-h"), tipVal = el("span", "pc-tipval");
    thead.appendChild(tipH); thead.appendChild(tipVal); tcard.appendChild(thead);
    var grp = el("div", "pc-chips"); grp.setAttribute("role", "radiogroup"); grp.setAttribute("aria-label", P.tip);
    var choices = [{ kind: "none", label: "0%" }].concat(p.t.map(function (n) { return { kind: "pct", pct: n, label: n + "%" }; }));
    var tbtns = choices.map(function (c) {
      var b = el("button", "mn-tipbtn", c.label); b.type = "button"; b.setAttribute("role", "radio");
      if (c.kind === "pct") b.setAttribute("data-pct", String(c.pct)); else { b.setAttribute("data-tip", c.kind); b.setAttribute("aria-label", P.noTip + " (0%)"); }
      b.addEventListener("click", function () { S.tip = c.kind === "pct" ? { kind: "pct", pct: c.pct } : { kind: c.kind }; S.custom = ""; cin.value = ""; update(); });
      grp.appendChild(b); return b;
    });
    tcard.appendChild(grp);
    var crow = el("div", "pc-customrow"), cplace = P.custom + " (" + currencySign(m.c) + ")";
    var clab = el("label", "pc-sr", P.customLabel + " (" + currencySign(m.c) + ")"); clab.setAttribute("for", "mn-ctip");
    var cin = el("input", "mn-amt mn-ctip"); cin.id = "mn-ctip"; cin.type = "text"; cin.value = S.custom; cin.maxLength = 12; cin.spellcheck = false; cin.placeholder = cplace;
    cin.setAttribute("inputmode", "decimal"); cin.setAttribute("autocomplete", "off"); cin.setAttribute("autocapitalize", "off");
    crow.appendChild(clab); crow.appendChild(cin); tcard.appendChild(crow);
    main.appendChild(tcard);

    // summary: the big total
    var sum = el("section", "pc-card mn-sum"), dl = el("dl");
    function line(cls, label, parent) { var dt = el("dt", cls, label), dd = el("dd", cls, ""); (parent || dl).appendChild(dt); (parent || dl).appendChild(dd); return { dt: dt, dd: dd }; }
    var lWhole = line("mn-l-whole", P.mWhole), lBill = line("mn-l-bill", P.food), lTip = line("mn-l-tip", P.tip);
    var grand = el("div", "pc-grand"); dl.appendChild(grand);
    var lTot = line("mn-l-total", P.toPay, grand);
    sum.appendChild(dl); main.appendChild(sum);

    var mh = withIcon(el("h2", "pc-mh", P.howH), "card"); main.appendChild(mh);
    var mbox = el("div", "mn-methods"); main.appendChild(mbox);
    if (p.n) main.appendChild(el("p", "mn-paynote", p.n));
    main.appendChild(el("p", "mn-safe", host ? fill(P.safe, { host: host }) : P.safeNo));

    // rating: stars, an optional comment and the SAME buttons for every rating (no review gating)
    var starEls = [], aG = null, aW = null, aM = null, rateCard = null;
    if (p.r || p.w || p.m) {
      rateCard = el("section", "pc-card pc-rate");
      rateCard.appendChild(el("h2", "pc-h pc-rateh", P.rateH));
      var stars = el("div", "pc-stars"); stars.setAttribute("role", "radiogroup"); stars.setAttribute("aria-label", P.rateH);
      for (var si = 1; si <= 5; si++) (function (n) {
        var lab = el("label", "pc-star"), inp = el("input"); inp.type = "radio"; inp.name = "mn-rate"; inp.value = String(n);
        inp.setAttribute("aria-label", fill(P.star, { n: n })); inp.checked = S.rate === n;
        inp.addEventListener("change", function () { S.rate = n; paintRate(); });
        lab.appendChild(inp); lab.appendChild(icon("star")); stars.appendChild(lab); starEls.push(lab);
      })(si);
      rateCard.appendChild(stars);
      if (p.w || p.m) {
        var cl = el("label", "pc-cl", P.cmt); cl.setAttribute("for", "mn-cmt"); rateCard.appendChild(cl);
        var ta = el("textarea", "pc-ta"); ta.id = "mn-cmt"; ta.rows = 3; ta.maxLength = 300; ta.value = S.cmt; ta.setAttribute("autocomplete", "off");
        ta.addEventListener("input", function () { S.cmt = ta.value; paintRate(); });
        rateCard.appendChild(ta);
        rateCard.appendChild(el("p", "pc-hint", P.cmtHint));
      }
      var acts = el("div", "pc-acts");
      function act(cls, ic, label, sub) {
        var a = el("a", "pc-act " + cls), t = el("span", null, label); a.appendChild(icon(ic));
        if (sub) { t.appendChild(document.createTextNode(" ")); t.appendChild(el("span", "pc-nw", "(" + sub + ")")); }   // the bracket stays in one piece: no "(e-" / "mail)"
        a.appendChild(t); acts.appendChild(a); return a;
      }
      if (p.r) { aG = act("pc-act-g", "ext", P.gBtn); aG.href = p.r; aG.target = "_blank"; aG.rel = "noopener noreferrer"; }
      var both = !!(p.w && p.m);
      if (p.w) { aW = act("pc-act-w", "chat", P.mgrBtn, both ? P.mgrWa : ""); aW.target = "_blank"; aW.rel = "noopener noreferrer"; }
      if (p.m) { aM = act("pc-act-m", "mail", P.mgrBtn, both ? P.mgrMail : ""); }
      rateCard.appendChild(acts);
      rateCard.appendChild(el("p", "pc-note", P.rateNote));
      main.appendChild(rateCard);
    }
    root.appendChild(main);
    root.appendChild(brandFooter());

    // ----- building the bill cards -----
    function layoutKey() { return (pl ? "L" : "A") + S.sig; }
    function buildBill() {
      billBox.textContent = ""; segBtns = []; lineEls = []; itemsCard = null; amtInp = null; fromLab = null;
      built = layoutKey();
      var card = splitCard = el("section", "pc-card pc-splitcard");
      card.appendChild(el("h2", "pc-h", P.splitH));
      var modes = [{ k: "whole", t: P.mWhole }]; if (pl) modes.push({ k: "items", t: P.mItems }); modes.push({ k: "split", t: P.mSplit });
      var seg = el("div", "pc-seg"); seg.setAttribute("role", "radiogroup"); seg.setAttribute("aria-label", P.splitH);
      modes.forEach(function (md) {
        var b = el("button", null, md.t); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("data-mode", md.k);
        b.addEventListener("click", function () { S.mode = md.k; update(); });
        seg.appendChild(b); segBtns.push(b);
      });
      card.appendChild(seg);
      if (!pl) {   // no item lines: the guest types (or checks) the amount
        var ab = el("div", "pc-amountbox"), top2 = el("div", "mn-fromrow");
        fromLab = el("label", "mn-fromline"); fromLab.setAttribute("for", "mn-amt"); top2.appendChild(fromLab);
        if (canLookUp) top2.appendChild(refreshBtn());
        ab.appendChild(top2);
        var row = el("div", "mn-amtrow");
        amtInp = el("input", "mn-amt"); amtInp.id = "mn-amt"; amtInp.type = "text"; amtInp.value = S.bill; amtInp.maxLength = 12; amtInp.spellcheck = false;
        amtInp.setAttribute("inputmode", "decimal"); amtInp.setAttribute("autocomplete", "off"); amtInp.setAttribute("autocapitalize", "off"); amtInp.setAttribute("enterkeyhint", "done");
        amtInp.addEventListener("input", function () { S.bill = amtInp.value; S.touched = true; update(); });
        row.appendChild(amtInp); row.appendChild(el("span", "mn-cursign", currencySign(m.c)));
        ab.appendChild(row); card.appendChild(ab);
      }
      peopleBox = el("div", "pc-people");
      var plab = el("span", "pc-pl", P.people); peopleBox.appendChild(plab);
      peopleStep = stepper(2, 20, function () { return S.n; }, function (v) { S.n = v; update(); }, String, P);
      peopleStep.setAttribute("data-step", "people");
      peopleBox.appendChild(peopleStep);
      card.appendChild(peopleBox);
      noteEl = el("p", "pc-hint pc-splitnote", P.splitNote); card.appendChild(noteEl);
      billBox.appendChild(card);

      if (pl) {
        var ic = itemsCard = el("section", "pc-card pc-items"), ih = el("div", "pc-ihead");
        ih.appendChild(el("h2", "pc-h", P.ordered)); cnt = el("span", "pc-cnt"); ih.appendChild(cnt);
        ic.appendChild(ih);
        var ul = el("ul", "pc-lines");
        pl.forEach(function (l, i) {
          var li = el("li", "pc-line"), lab = el("label", "pc-lab");
          var ck = el("input", "pc-chk"); ck.type = "checkbox";
          var bx = el("span", "pc-box"); bx.appendChild(icon("check", "pc-ck")); bx.appendChild(icon("minus", "pc-mi"));
          var tx = el("span", "pc-tx"); tx.appendChild(el("span", "pc-nm", l.n));
          if (l.q > 1) tx.appendChild(el("span", "pc-sub", l.q + " × " + money(l.u)));
          lab.appendChild(ck); lab.appendChild(bx); lab.appendChild(tx); li.appendChild(lab);
          li.appendChild(el("span", "pc-lp", money(l.sum)));
          var st = null;
          if (l.q > 1) {
            st = stepper(0, l.q, function () { return S.sel[i] | 0; }, function (v) { S.sel[i] = v; update(); }, function (v) { return v + " / " + l.q; }, P);
            st.classList.add("pc-pickable"); li.appendChild(st);
          }
          ck.addEventListener("change", function () { S.sel[i] = ck.checked ? l.q : 0; update(); });
          ul.appendChild(li); lineEls.push({ li: li, ck: ck, st: st });
        });
        ic.appendChild(ul);
        if (canLookUp) { var rw = el("div", "pc-refresh"); rw.appendChild(refreshBtn()); ic.appendChild(rw); }
        billBox.appendChild(ic);
      }
    }
    function refreshBtn() {
      var rb = withIcon(el("button", "mn-linkbtn", P.refresh), "refresh"); rb.type = "button";
      rb.addEventListener("click", function () { lookUp(true); });
      return rb;
    }

    // ----- numbers -----
    function calc() {
      var whole = pl ? linesTotal(pl) : toMinor(parseAmount(S.bill) || 0, d), share = whole;
      if (S.mode === "split") share = splitShare(whole, S.n);
      else if (S.mode === "items" && pl) share = selTotal(pl, S.sel);
      var tip = S.tip.kind === "custom" ? { kind: "custom", minor: toMinor(parseAmount(S.custom) || 0, d) } : S.tip;
      var t = payTotals(share, tip);
      return { whole: whole, share: share, tip: t.tip, total: t.total };
    }
    function paintHead() {
      var w = S.data && S.data.w || "";
      liW.hidden = !w; wTxt.textContent = w ? fill(P.waiter, { name: w }) : "";
      chipOpen.hidden = !pl;
      meta.hidden = !opts.tb && !w;
      tipH.textContent = w ? fill(P.tipFor, { name: w }) : P.tip;
    }
    function paintBill(c) {
      segBtns.forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-mode") === S.mode ? "true" : "false"); });
      var split = S.mode === "split";
      peopleBox.hidden = !split; noteEl.hidden = !split;
      peopleStep.paint();
      if (fromLab) fromLab.textContent = S.from !== null ? P.fromBill + ": " + fmt.format(S.from) : P.enterAmt;
      if (itemsCard) {
        itemsCard.classList.toggle("pick", S.mode === "items");
        var sel = 0, all = 0;
        pl.forEach(function (l, i) {
          var n = S.mode === "items" ? Math.max(0, Math.min(l.q, S.sel[i] | 0)) : l.q, e = lineEls[i];
          sel += n; all += l.q;
          var pickMode = S.mode === "items";
          e.ck.disabled = !pickMode; if (pickMode) e.ck.removeAttribute("aria-hidden"); else e.ck.setAttribute("aria-hidden", "true");
          e.ck.checked = pickMode ? n > 0 : true; e.ck.indeterminate = pickMode && n > 0 && n < l.q;
          e.li.classList.toggle("on", S.mode === "items" && n > 0);
          if (e.st) e.st.paint();
        });
        cnt.textContent = sel + " / " + all;
      }
    }
    function paintTip(c) {
      tbtns.forEach(function (b, i) {
        var ch = choices[i], on = ch.kind === S.tip.kind && (ch.kind !== "pct" || ch.pct === S.tip.pct);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
      cin.classList.toggle("is-on", S.tip.kind === "custom");
      tipVal.textContent = (c.share > 0 || c.tip > 0) ? money(c.tip) + (S.tip.kind === "pct" ? " (" + S.tip.pct + "%)" : "") : "—";
    }
    function paintRate() {
      starEls.forEach(function (lab, i) { lab.classList.toggle("on", i < S.rate); lab.firstChild.checked = S.rate === i + 1; });
      var txt = feedbackText(L, P, opts.tb, S.rate, S.cmt);
      if (aW) aW.href = waUrl(p.w, txt);
      if (aM) aM.href = mailUrl(p.m, P.fbSubject + (opts.tb ? " · " + L.table + " " + opts.tb : ""), txt);
    }
    function copyRow(parent, label, shown, plain) {
      var kv = el("div", "mn-kv"); kv.appendChild(el("span", "mn-k", label));
      var v = el("span", "mn-val", shown); kv.appendChild(v);
      kv.appendChild(copyBtn(P.copy, plain, P, v, label));
      parent.appendChild(kv);
    }
    function methods(t) {
      mbox.textContent = "";
      var have = t.total > 0, totalTxt = have ? money(t.total) : "";
      if (p.x) {
        var c = el("section", "pc-mcard mn-terminal");
        c.appendChild(withIcon(el("h3", "mn-mh", P.terminalH), "card"));
        c.appendChild(el("p", "mn-t-label", P.toPay));
        c.appendChild(el("p", "mn-t-total", have ? totalTxt : "—"));
        if (t.tip > 0) c.appendChild(el("p", "mn-t-tip", P.tip + ": " + money(t.tip)));
        else if (have) c.appendChild(el("p", "mn-t-tip", P.noTip));
        if (opts.tb) c.appendChild(el("p", "mn-t-table", L.table + " " + opts.tb));
        mbox.appendChild(c);
      }
      if (host) {
        var inUrl = have && isPayPalName(p.l);
        var a = el("a", "pc-go-btn mn-paylink");
        a.appendChild(icon("link")); a.appendChild(el("span", null, have ? fill(P.payOn, { total: totalTxt, host: host }) : fill(P.openHost, { host: host })));
        a.href = inUrl ? paypalUrl(p.l, t.total, d, paypalCode(m.c)) : p.l; a.target = "_blank"; a.rel = "noopener noreferrer";
        mbox.appendChild(a);
        if (have && !inUrl) {
          var cr = el("div", "mn-copyrow");
          cr.appendChild(copyBtn(P.copyAmount, plainAmount(t.total, d, comma), P, null));
          cr.appendChild(el("p", "mn-enter", fill(P.enterOn, { total: totalTxt })));
          mbox.appendChild(cr);
        }
      }
      if (p.b) {
        var bc = el("section", "pc-mcard mn-blik");
        bc.appendChild(withIcon(el("h3", "mn-mh", P.blikH), "phone"));
        copyRow(bc, P.phone, p.b, p.b);
        if (have) copyRow(bc, P.amount, totalTxt, plainAmount(t.total, d, comma));
        if (opts.tb) copyRow(bc, P.ttl, L.table + " " + opts.tb, L.table + " " + opts.tb);
        bc.appendChild(el("p", "mn-hint", P.blikHint));
        mbox.appendChild(bc);
      }
    }
    function update() {
      var c = calc(), whole = S.mode === "whole";
      paintHead(); paintBill(c); paintTip(c);
      lWhole.dt.hidden = lWhole.dd.hidden = whole;
      lWhole.dd.textContent = c.whole > 0 ? money(c.whole) : "—";
      lBill.dt.textContent = whole ? P.food : P.share;
      lBill.dd.textContent = c.share > 0 ? money(c.share) : "—";
      lTip.dt.textContent = P.tip + (S.tip.kind === "pct" ? " (" + S.tip.pct + "%)" : "");
      lTip.dd.textContent = c.share > 0 || c.tip > 0 ? money(c.tip) : "—";
      lTot.dd.textContent = c.total > 0 ? money(c.total) : "—";
      methods(c);
      paintRate();
    }
    cin.addEventListener("input", function () { S.custom = cin.value; if (cin.value.trim()) S.tip = { kind: "custom" }; else if (S.tip.kind === "custom") S.tip = { kind: "none" }; update(); });
    buildBill(); update();

    // the bill from the sheet (live mode with a table number): looked up when this screen opens, never blocks the guest
    function lookUp(force) {
      var token = ++S.seq;
      opts.bills().then(function (b) {
        if (token !== S.seq || !b) return;
        S.data = b; S.from = typeof b.amount === "number" ? b.amount : null;
        setLines();
        if (S.from !== null && (force || (!S.touched && !S.bill))) { S.bill = plainAmount(toMinor(S.from, d), d, comma); S.touched = false; if (amtInp) amtInp.value = S.bill; }
        if (layoutKey() !== built) buildBill();
        update();
      });
    }
    if (canLookUp) lookUp(false);
  }


  var scrollOff = null;
  function trackChips(chipBox, chips, secEls) {
    if (scrollOff) scrollOff();
    var active = -1, ticking = false;
    function setActive(i) {
      if (i === active) return;
      active = i;
      chips.forEach(function (c, k) {
        if (k === i) { c.setAttribute("aria-current", "true"); c.classList.add("on"); } else { c.removeAttribute("aria-current"); c.classList.remove("on"); }
      });
      var c = chips[i];
      if (c && chipBox.scrollWidth > chipBox.clientWidth) {
        var target = c.offsetLeft - (chipBox.clientWidth - c.offsetWidth) / 2;
        if (typeof chipBox.scrollTo === "function") chipBox.scrollTo({ left: target, behavior: "auto" }); else chipBox.scrollLeft = target;
      }
    }
    function update() {
      ticking = false;
      var navH = chipBox.parentNode.offsetHeight || 0, idx = 0;
      for (var i = 0; i < secEls.length; i++) { if (secEls[i].getBoundingClientRect().top <= navH + 24) idx = i; }
      var atEnd = (global.innerHeight + global.scrollY) >= document.documentElement.scrollHeight - 4;
      if (atEnd && global.scrollY > 0) idx = secEls.length - 1;
      setActive(idx);
    }
    function onScroll() { if (!ticking) { ticking = true; global.requestAnimationFrame(update); } }
    global.addEventListener("scroll", onScroll, { passive: true });
    global.addEventListener("resize", onScroll);
    scrollOff = function () { global.removeEventListener("scroll", onScroll); global.removeEventListener("resize", onScroll); };
    update();
  }

  // ---------- boot (viewer page only) ----------
  function isLocalHost() { var h = global.location && global.location.hostname; return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1"; }
  function liveUrl(s, g) {
    return "https://docs.google.com/spreadsheets/d/e/" + s + "/pub?" + (g ? "gid=" + g + "&" : "") + "single=true&output=csv";
  }

  // Share-link mode (?d=<doc id>): a normal Google Sheets sharing link ("Anyone with the link" + Viewer), read through the gviz CSV endpoint.
  var DOC_RE = /^[A-Za-z0-9_\-]{25,100}$/;
  var DEFAULT_TAB = "Publish this tab";
  function cleanTab(t, def) { t = String(t == null ? "" : t).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 100); return t || def || DEFAULT_TAB; }
  function docUrl(id, tab, def) {
    return "https://docs.google.com/spreadsheets/d/" + id + "/gviz/tq?tqx=out:csv&headers=0&sheet=" + encodeURIComponent(cleanTab(tab, def));
  }
  // The bills tab, asked for when the Pay screen opens: "Bill feed" (table,item,qty,price,waiter) or the name given with &bt=.
  // When that tab is not a bill feed (gviz answers with the first tab if the named one does not exist), the old "Bills" tab (table,amount) is tried once.
  // Same fetch options as the menu; any failure just means "no bill found" and never blocks the guest.
  // -> Promise of {w, lines, amount?} | null
  function fetchBills(d, bt, tb) {
    function getText(tab) {
      var ctrl = typeof AbortController === "function" ? new AbortController() : null, timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : 0;
      return fetch(docUrl(d, tab, DEFAULT_BILLS), { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", redirect: "follow", signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) { return res.ok ? res.text() : null; })
        .then(function (text) { clearTimeout(timer); return text == null || /^\s*</.test(text) ? null : text; })
        .catch(function () { clearTimeout(timer); return null; });
    }
    var first = cleanTab(bt, DEFAULT_BILLS);
    return getText(first).then(function (text) {
      if (text === null) return null;
      var parsed = parseBills(text);
      if (parsed || first === LEGACY_BILLS) return pickBill(parsed, tb);
      return getText(LEGACY_BILLS).then(function (t2) { return t2 === null ? null : pickBill(parseBills(t2), tb); });
    });
  }

  // Pasted Google Sheets link -> one of
  //   {ok:true, kind:"share", doc}              any normal sharing link (/edit, /view, ?usp=sharing, #gid=, /u/0/, long mobile links) or the bare id
  //   {ok:true, kind:"pub"|"pubhtml", id, gid}  a "publish to web" link (/d/e/.../pub...) or the whole embed code
  //   {ok:false, reason}                        empty | other | wronghost | drive | notsheet | copy
  function parseSheetLink(text) {
    text = String(text == null ? "" : text).trim();
    if (!text) return { ok: false, reason: "empty" };
    if (DOC_RE.test(text)) return /^2PACX-/.test(text) ? { ok: true, id: text, gid: "", kind: "pub" } : { ok: true, kind: "share", doc: text };
    if (/^(javascript|data|vbscript|file|blob|ftp)\s*:/i.test(text)) return { ok: false, reason: "other" };
    var src = text, fr = text.match(/<iframe[^>]*\ssrc\s*=\s*["']([^"']+)["']/i);
    if (fr) src = fr[1].replace(/&amp;/g, "&");
    var um = src.match(/https?:\/\/[^\s"'<>]+/);
    if (!um && /^(docs|drive)\.google\.com\//i.test(src.trim())) um = ["https://" + src.trim().split(/[\s"'<>]/)[0]];
    if (!um) return { ok: false, reason: "other" };
    var u;
    try { u = new URL(um[0]); } catch (e) { return { ok: false, reason: "other" }; }
    if (u.protocol !== "https:") return { ok: false, reason: "other" };
    if (u.hostname === "drive.google.com") return { ok: false, reason: "drive" };
    if (u.hostname !== "docs.google.com") return { ok: false, reason: "wronghost" };
    var parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "u" && /^\d{1,2}$/.test(parts[1] || "")) parts = parts.slice(2);        // /u/0/spreadsheets/...  (account switcher)
    else if (parts[0] === "a" && /^[A-Za-z0-9.\-]{1,100}$/.test(parts[1] || "")) parts = parts.slice(2);   // /a/example.com/spreadsheets/...  (Workspace)
    if (parts[0] !== "spreadsheets") return { ok: false, reason: /^(forms|document|presentation|drawings)$/.test(parts[0] || "") ? "notsheet" : "other" };
    var i = 1;
    if (parts[i] === "u" && /^\d{1,2}$/.test(parts[i + 1] || "")) i += 2;                  // /spreadsheets/u/0/d/...
    if (parts[i] !== "d") return { ok: false, reason: "other" };
    i++;
    if (parts[i] === "e") {
      var pid = parts[i + 1] || "", kind = parts[i + 2];
      if (!/^[A-Za-z0-9_\-]{20,200}$/.test(pid) || (kind !== "pub" && kind !== "pubhtml")) return { ok: false, reason: "other" };
      var g = (u.search + "&" + u.hash).match(/[?&#]gid=(\d{1,12})(?=[&#]|$)/);
      return { ok: true, id: pid, gid: g ? g[1] : "", kind: kind };
    }
    var id = parts[i] || "", tail = parts[i + 1];
    if (!DOC_RE.test(id)) return { ok: false, reason: "other" };
    if (tail === "copy") return { ok: false, reason: "copy" };
    if (tail !== undefined && !/^(edit|view|htmlview|preview|mobilebasic)$/.test(tail)) return { ok: false, reason: "other" };
    return { ok: true, kind: "share", doc: id };
  }

  function status(root, text, cls) {
    root.textContent = "";
    var p = el("p", "mn-status " + (cls || ""), text);
    p.setAttribute("role", cls === "err" ? "alert" : "status");
    root.appendChild(p);
    return p;
  }
  var OWNER_HINTS = {
    share: "Owner: in Google Sheets choose Share \u2192 Anyone with the link \u2192 Viewer.",
    tab: "Owner: the sheet needs a tab with this menu\u2019s name (\u201cPublish this tab\u201d unless you chose another) laid out like the template."
  };
  function showError(root, lang, key, retry, hint) {
    var L = T[lang];
    setMeta({ n: "", l: lang, t: document.documentElement.getAttribute("data-theme") || "mono" }, L);
    root.textContent = "";
    root.removeAttribute("aria-busy");
    var box = el("div", "mn-error");
    box.setAttribute("role", "alert");
    box.appendChild(el("p", "mn-etext", L[key]));
    if (hint && OWNER_HINTS[hint]) box.appendChild(el("p", "mn-owner", OWNER_HINTS[hint]));
    if (retry) {
      var b = el("button", "mn-btn", L.retry); b.type = "button";
      b.addEventListener("click", retry);
      box.appendChild(b);
    }
    root.appendChild(box);
    var foot = el("footer", "mn-foot");
    var a = el("a", "mn-brand", "Free QR menu by DoughMath Studio");
    a.href = HOME; a.rel = "noopener"; foot.appendChild(a);
    box.appendChild(foot);
  }

  // GitHub Pages cannot send frame-ancestors headers, so the page checks for itself:
  // framed by another origin -> show a short notice and a link instead of the menu.
  function framedByOtherOrigin() {
    if (global.top === global.self) return false;
    try { return global.parent.location.origin !== global.location.origin; } catch (e) { return true; }
  }

  function boot() {
    var root = document.getElementById("menu-root");
    if (!root) return;
    if (framedByOtherOrigin()) {
      var fl = pickLang(new URLSearchParams(global.location.search).get("l") || browserLang()), FL = T[fl];
      root.textContent = ""; root.removeAttribute("aria-busy");
      var fb = el("div", "mn-error");
      fb.appendChild(el("p", "mn-etext", FL.framed));
      var fa = el("a", "mn-btn mn-link", FL.open);
      fa.href = global.location.href; fa.target = "_blank"; fa.rel = "noopener noreferrer";
      fb.appendChild(fa);
      root.appendChild(fb);
      return;
    }
    var q = new URLSearchParams(global.location.search);
    if (q.get("preview") === "1") { root.textContent = ""; root.removeAttribute("aria-busy"); return; } // builder preview: the parent page calls render()
    var hash = global.location.hash.replace(/^#/, "");
    var uiLang = pickLang(q.get("l") || browserLang());
    var started = 0;

    // builder preview (?embed=1): tell the same-origin parent page what was loaded, so it can show the result next to the preview
    var embed = q.get("embed") === "1" && global.parent && global.parent !== global.self;
    var tbRaw = q.get("tb"), tb = /^\d{1,3}$/.test(tbRaw || "") && +tbRaw >= 1 ? +tbRaw : 0;   // table number 1..999 (from the table's own QR)
    var bt = q.get("bt");                                                                          // name of the bills tab (default "Bill feed")
    // show the menu; with payments switched on the guest first sees the start screen (Menu / Pay the bill)
    function present(raw, docId) {
      var m = normalize(raw), o = { tb: tb, nav: !embed, view: payActive(m) ? "start" : "menu" };
      if (embed) o.onView = function (v) { tell({ dmView: v }); };   // the builder's Start / Menu / Pay switch follows the guest page
      if (docId) o.bills = function () { return fetchBills(docId, bt, tb); };
      render(root, m, o);
      if (o.nav) { try { global.history.replaceState({ dmView: last.view }, "", global.location.href); } catch (e) { /* ignore */ } }
      return last.m;
    }
    function tell(msg) {
      if (!embed) return;
      try { msg.q = global.location.search; global.parent.postMessage(msg, global.location.origin); } catch (e) { /* no listener: nothing to do */ }
    }

    function load() {
      var my = ++started;
      root.setAttribute("aria-busy", "true");
      var s = q.get("s"), g = q.get("g"), d = q.get("d"), t = q.get("t");
      var override = isLocalHost() ? q.get("csv") : null; // test-only: honoured on localhost only

      if (hash) {
        decodePayload(hash).then(function (obj) {
          if (my !== started) return;
          present(obj, "");
        }, function (err) {
          if (my !== started) return;
          showError(root, uiLang, err && err.code === "old" ? "oldBrowser" : "badLink");
        });
        return;
      }
      if (override || d || s) {
        var mode = override ? "csv" : d ? "d" : "s";   // priority: test override, share link (?d=), published link (?s=)
        if (mode === "d" && !DOC_RE.test(d)) { tell({ dmLive: 1, ok: false, key: "badLink" }); return showError(root, uiLang, "badLink"); }
        if (mode === "s" && !/^[A-Za-z0-9_\-]{20,200}$/.test(s)) return showError(root, uiLang, "badLink");
        if (mode === "s" && g && !/^\d{1,12}$/.test(g)) return showError(root, uiLang, "badLink");
        var url = mode === "csv" ? override : mode === "d" ? docUrl(d, t) : liveUrl(s, g);
        var hint = mode === "d" ? "share" : "";
        var ctrl = (typeof AbortController === "function") ? new AbortController() : null;
        var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : 0;
        var retry = function () { status(root, T[uiLang].loading, "load"); load(); };
        fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store", redirect: "follow", signal: ctrl ? ctrl.signal : undefined }).then(function (res) {
          if (!res.ok) throw fail("net");
          return res.text();
        }).then(function (text) {
          clearTimeout(timer);
          if (my !== started) return;
          // a sign-in or "no access" page comes back as HTML with status 200: that is an access problem, not a menu problem
          if (mode === "d" && /^\s*</.test(text)) throw fail("net");
          var menu;
          try { menu = menuFromCsv(text); } catch (e) { tell({ dmLive: 1, ok: false, key: "csvErr" }); return showError(root, uiLang, "csvErr", retry, mode === "d" ? "tab" : ""); }
          var shown = present(menu, mode === "d" ? d : "");
          tell({ dmLive: 1, ok: true, menu: shown });
        }).catch(function () {
          clearTimeout(timer);
          if (my !== started) return;
          tell({ dmLive: 1, ok: false, key: "netErr" });
          showError(root, uiLang, "netErr", retry, hint);
        });
        return;
      }
      showError(root, uiLang, "noMenu");
    }
    status(root, T[uiLang].loading, "load");
    load();
    global.addEventListener("popstate", function (e) { var v = e.state && e.state.dmView; if (last && (v === "start" || v === "menu" || v === "pay")) setView(v, true); });
    global.addEventListener("hashchange", function () { hash = global.location.hash.replace(/^#/, ""); status(root, T[uiLang].loading, "load"); load(); });
  }

  var api = {
    LANGS: LANGS, LOCALES: LOCALES, THEMES: THEMES, TAGS: TAGS, T: T, HOME: HOME,
    normalize: normalize, encodePayload: encodePayload, decodePayload: decodePayload,
    canCompress: canCompress, canDecompress: canDecompress,
    parseCsv: parseCsv, menuFromRows: menuFromRows, menuFromCsv: menuFromCsv, parsePrice: parsePrice,
    priceFormatter: priceFormatter, parseSheetLink: parseSheetLink, docUrl: docUrl, cleanTab: cleanTab, DOC_RE: DOC_RE, DEFAULT_TAB: DEFAULT_TAB, currencyCode: currencyCode, allWhole: allWhole, liveUrl: liveUrl,
    render: render, setView: setView, boot: boot,
    payActive: payActive, normalizePay: normalizePay, parseTips: parseTips, checkPayLink: checkPayLink, checkBlik: checkBlik, parseAmount: parseAmount,
    billsFromRows: billsFromRows, billFor: billFor, feedFromRows: feedFromRows, parseBills: parseBills, pickBill: pickBill, fetchBills: fetchBills, splitShare: splitShare, prepLines: prepLines, linesTotal: linesTotal, selTotal: selTotal,
    feedbackText: feedbackText, waUrl: waUrl, mailUrl: mailUrl, checkEmail: checkEmail, LEGACY_BILLS: LEGACY_BILLS, tipMinor: tipMinor, payTotals: payTotals, plainAmount: plainAmount, paypalUrl: paypalUrl, paypalCode: paypalCode,
    isPayPalName: isPayPalName, minorDigits: minorDigits, toMinor: toMinor, moneyFormatter: moneyFormatter, PAY_T: PAY_T, DEFAULT_BILLS: DEFAULT_BILLS, DEFAULT_TIPS: DEFAULT_TIPS, bytesToB64url: bytesToB64url, b64urlToBytes: b64urlToBytes
  };
  global.DMMenu = api;
  if (typeof module === "object" && module && module.exports) module.exports = api;

  if (typeof document !== "undefined" && document.documentElement.hasAttribute("data-dm-viewer")) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  }
})(typeof window !== "undefined" ? window : this);

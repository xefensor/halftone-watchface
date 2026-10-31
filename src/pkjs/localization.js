'use strict';

// The order is shared by the compact translation rows below. English literals
// are accepted as keys too, so the Clay schema stays readable and unchanged.
var KEYS = ['title','intro','colors','background','textColor','timeTemperature','waiting','followUnits',
  'time12','fahrenheit','unitsHelp','weatherLocation','firstLocation','details','showRange','showRain',
  'detailsHelp','textSize','largeText','effects','dotSteps','shadow','save','sharedSource','legacySource',
  'received','lastRead','savedUnavailable','sourceError','permissionDenied','sourceUnavailable','sourceTimeout','networkError'];
var ROWS = {
  en:[
    'Halftone Settings',
    'Choose the colors and optional depth effects. The dithered bezel transition remains black.',
    'Colors','Background color','Text color','Time & temperature','Weather source: waiting for data',
    'Follow Pebble temperature units','12-hour time','Temperature in Fahrenheit',
    "Fahrenheit applies when Follow Pebble is off. Shared weather uses Pebble's saved locations; older apps use the phone's current location.",
    'Weather location','First Pebble weather location','Weather details',
    "Show today's low and high","Show today's rain / snow chance",
    "Uses Pebble's shared weather. L/H show today's low/high; P shows precipitation probability. Missing data stays hidden. Details hide while Timeline Peek is visible.",
    'Text size','Extra-large edge-to-edge text','Optical effects','4-step dot transition','Floating text shadow','Save settings',
    'Pebble shared current conditions','Compatibility weather','Received {temperature}',
    'Last source read {minutes} min ago','Saved location (currently unavailable)','Source error: {error}',
    'Location permission denied','Shared weather unavailable','Source read timed out','Could not read shared weather'
  ],
  cs:[
    'Nastavení Halftone',
    'Vyberte barvy a volitelné prostorové efekty. Tečkovaný přechod u rámečku zůstane černý.',
    'Barvy','Barva pozadí','Barva textu','Čas a teplota','Zdroj počasí: čeká se na data',
    'Použít jednotky teploty z Pebble','12hodinový čas','Teplota ve Fahrenheitech',
    'Fahrenheity se použijí, když jsou jednotky z Pebble vypnuté. Sdílené počasí používá místa uložená v Pebble; starší aplikace používají aktuální polohu telefonu.',
    'Místo pro počasí','První místo pro počasí v Pebble','Podrobnosti o počasí',
    'Zobrazit dnešní minimum a maximum','Zobrazit dnešní pravděpodobnost deště / sněhu',
    'Používá sdílené počasí Pebble. min/max označuje dnešní minimum a maximum; S pravděpodobnost srážek. Chybějící data se nezobrazí. Při zobrazení Timeline Peek se podrobnosti skryjí.',
    'Velikost textu','Velký text od kraje ke kraji','Optické efekty','Tečkovaný přechod ve 4 krocích','Stín plovoucího textu','Uložit nastavení',
    'Sdílené aktuální počasí Pebble','Kompatibilní zdroj počasí','Přijato {temperature}',
    'Poslední načtení zdroje před {minutes} min','Uložené místo (momentálně nedostupné)','Chyba zdroje: {error}',
    'Přístup k poloze zamítnut','Sdílené počasí není dostupné','Načtení zdroje vypršelo','Sdílené počasí se nepodařilo načíst'
  ],
  sk:[
    'Nastavenia Halftone',
    'Vyberte farby a voliteľné priestorové efekty. Bodkovaný prechod pri ráme zostane čierny.',
    'Farby','Farba pozadia','Farba textu','Čas a teplota','Zdroj počasia: čaká sa na údaje',
    'Použiť jednotky teploty z Pebble','12-hodinový čas','Teplota vo Fahrenheitoch',
    'Fahrenheity sa použijú, keď sú jednotky z Pebble vypnuté. Zdieľané počasie používa miesta uložené v Pebble; staršie aplikácie používajú aktuálnu polohu telefónu.',
    'Miesto pre počasie','Prvé miesto pre počasie v Pebble','Podrobnosti o počasí',
    'Zobraziť dnešné minimum a maximum','Zobraziť dnešnú pravdepodobnosť dažďa / snehu',
    'Používa zdieľané počasie Pebble. min/max označuje dnešné minimum a maximum; Z pravdepodobnosť zrážok. Chýbajúce údaje sa nezobrazia. Pri zobrazení Timeline Peek sa podrobnosti skryjú.',
    'Veľkosť textu','Veľký text od okraja po okraj','Optické efekty','Bodkovaný prechod v 4 krokoch','Tieň plávajúceho textu','Uložiť nastavenia',
    'Zdieľané aktuálne počasie Pebble','Kompatibilný zdroj počasia','Prijaté {temperature}',
    'Posledné načítanie zdroja pred {minutes} min','Uložené miesto (momentálne nedostupné)','Chyba zdroja: {error}',
    'Prístup k polohe zamietnutý','Zdieľané počasie nie je dostupné','Načítanie zdroja vypršalo','Zdieľané počasie sa nepodarilo načítať'
  ],
  de:[
    'Halftone-Einstellungen',
    'Wähle Farben und optionale Tiefeneffekte. Der Übergang aus Punkten am Rand bleibt schwarz.',
    'Farben','Hintergrundfarbe','Textfarbe','Zeit und Temperatur','Wetterquelle: Warte auf Daten',
    'Temperatureinheiten von Pebble verwenden','12-Stunden-Zeit','Temperatur in Fahrenheit',
    'Fahrenheit gilt, wenn die Einheiten von Pebble deaktiviert sind. Geteilte Wetterdaten nutzen die in Pebble gespeicherten Orte; ältere Apps verwenden den aktuellen Standort des Telefons.',
    'Wetterstandort','Erster Wetterstandort in Pebble','Wetterdetails',
    'Heutige Tiefst- und Höchsttemperatur anzeigen','Heutige Regen- / Schneewahrscheinlichkeit anzeigen',
    'Nutzt geteilte Wetterdaten von Pebble. min/max steht für die heutige Tiefst- und Höchsttemperatur; N für die Niederschlagswahrscheinlichkeit. Fehlende Daten werden ausgeblendet. Während Timeline Peek sichtbar ist, bleiben die Details verborgen.',
    'Textgröße','Extragroßer Text von Rand zu Rand','Optische Effekte','Punktübergang in 4 Stufen','Schwebender Textschatten','Einstellungen speichern',
    'Geteilte aktuelle Wetterdaten von Pebble','Kompatibilitäts-Wetterquelle','Empfangen: {temperature}',
    'Quelle vor {minutes} Min. zuletzt gelesen','Gespeicherter Ort (derzeit nicht verfügbar)','Quellenfehler: {error}',
    'Standortzugriff verweigert','Geteilte Wetterdaten nicht verfügbar','Zeitüberschreitung beim Lesen der Quelle','Geteilte Wetterdaten konnten nicht gelesen werden'
  ],
  fr:[
    'Réglages Halftone',
    'Choisissez les couleurs et les effets de profondeur facultatifs. La transition en points près du cadre reste noire.',
    'Couleurs','Couleur de fond','Couleur du texte','Heure et température','Source météo : en attente de données',
    'Suivre les unités de température de Pebble','Format 12 heures','Température en Fahrenheit',
    'Les degrés Fahrenheit sont utilisés si les unités Pebble sont désactivées. La météo partagée utilise les lieux enregistrés dans Pebble ; les anciennes applications utilisent la position actuelle du téléphone.',
    'Lieu météo','Premier lieu météo de Pebble','Détails météo',
    'Afficher les températures minimale et maximale du jour','Afficher le risque de pluie / neige du jour',
    'Utilise la météo partagée de Pebble. min/max indique les températures minimale et maximale du jour ; P la probabilité de précipitations. Les données manquantes restent masquées. Les détails sont masqués pendant Timeline Peek.',
    'Taille du texte','Très grand texte sur toute la largeur','Effets optiques','Transition en points sur 4 niveaux','Ombre de texte flottante','Enregistrer les réglages',
    'Conditions actuelles partagées de Pebble','Source météo de compatibilité','Reçu : {temperature}',
    'Dernière lecture de la source il y a {minutes} min','Lieu enregistré (actuellement indisponible)','Erreur de source : {error}',
    'Accès à la position refusé','Météo partagée indisponible','Délai de lecture de la source dépassé','Impossible de lire la météo partagée'
  ],
  es:[
    'Ajustes de Halftone',
    'Elige los colores y los efectos de profundidad opcionales. La transición de puntos junto al marco permanece negra.',
    'Colores','Color de fondo','Color del texto','Hora y temperatura','Fuente meteorológica: esperando datos',
    'Usar las unidades de temperatura de Pebble','Formato de 12 horas','Temperatura en Fahrenheit',
    'Fahrenheit se usa si las unidades de Pebble están desactivadas. El tiempo compartido usa los lugares guardados en Pebble; las aplicaciones antiguas usan la ubicación actual del teléfono.',
    'Ubicación del tiempo','Primera ubicación del tiempo de Pebble','Detalles del tiempo',
    'Mostrar la mínima y máxima de hoy','Mostrar la probabilidad de lluvia / nieve de hoy',
    'Usa el tiempo compartido de Pebble. min/max indica la mínima y máxima de hoy; P la probabilidad de precipitación. Los datos que falten no se muestran. Los detalles se ocultan mientras se muestra Timeline Peek.',
    'Tamaño del texto','Texto extragrande de borde a borde','Efectos ópticos','Transición de puntos en 4 pasos','Sombra de texto flotante','Guardar ajustes',
    'Condiciones actuales compartidas de Pebble','Fuente meteorológica de compatibilidad','Recibido: {temperature}',
    'Última lectura de la fuente hace {minutes} min','Ubicación guardada (no disponible actualmente)','Error de la fuente: {error}',
    'Permiso de ubicación denegado','Tiempo compartido no disponible','Se agotó el tiempo de lectura de la fuente','No se pudo leer el tiempo compartido'
  ],
  it:[
    'Impostazioni Halftone',
    'Scegli i colori e gli effetti di profondità facoltativi. La transizione a punti vicino alla cornice resta nera.',
    'Colori','Colore dello sfondo','Colore del testo','Ora e temperatura','Fonte meteo: in attesa di dati',
    'Usa le unità di temperatura di Pebble','Formato a 12 ore','Temperatura in Fahrenheit',
    'I gradi Fahrenheit si usano quando le unità di Pebble sono disattivate. Il meteo condiviso usa i luoghi salvati in Pebble; le app meno recenti usano la posizione attuale del telefono.',
    'Località meteo','Prima località meteo di Pebble','Dettagli meteo',
    'Mostra la minima e la massima di oggi','Mostra la probabilità di pioggia / neve di oggi',
    'Usa il meteo condiviso di Pebble. min/max indica la minima e la massima di oggi; P la probabilità di precipitazioni. I dati mancanti restano nascosti. I dettagli si nascondono quando è visibile Timeline Peek.',
    'Dimensione del testo','Testo molto grande da bordo a bordo','Effetti ottici','Transizione a punti in 4 passaggi','Ombra del testo sospeso','Salva impostazioni',
    'Condizioni attuali condivise di Pebble','Fonte meteo di compatibilità','Ricevuto: {temperature}',
    'Ultima lettura della fonte {minutes} min fa','Località salvata (al momento non disponibile)','Errore della fonte: {error}',
    'Accesso alla posizione negato','Meteo condiviso non disponibile','Tempo di lettura della fonte scaduto','Impossibile leggere il meteo condiviso'
  ],
  pt:[
    'Configurações do Halftone',
    'Escolha as cores e os efeitos de profundidade opcionais. A transição de pontos junto à moldura permanece preta.',
    'Cores','Cor de fundo','Cor do texto','Hora e temperatura','Fonte do tempo: aguardando dados',
    'Usar as unidades de temperatura do Pebble','Formato de 12 horas','Temperatura em Fahrenheit',
    'Fahrenheit é usado quando as unidades do Pebble estão desativadas. O tempo compartilhado usa os locais salvos no Pebble; aplicativos antigos usam a localização atual do telefone.',
    'Local do tempo','Primeiro local do tempo do Pebble','Detalhes do tempo',
    'Mostrar a mínima e a máxima de hoje','Mostrar a probabilidade de chuva / neve de hoje',
    'Usa o tempo compartilhado do Pebble. min/max indica a mínima e a máxima de hoje; P a probabilidade de precipitação. Os dados ausentes ficam ocultos. Os detalhes são ocultados enquanto o Timeline Peek está visível.',
    'Tamanho do texto','Texto extragrande de ponta a ponta','Efeitos ópticos','Transição de pontos em 4 etapas','Sombra de texto flutuante','Salvar configurações',
    'Condições atuais compartilhadas do Pebble','Fonte do tempo de compatibilidade','Recebido: {temperature}',
    'Última leitura da fonte há {minutes} min','Local salvo (indisponível no momento)','Erro da fonte: {error}',
    'Permissão de localização negada','Tempo compartilhado indisponível','Tempo limite de leitura da fonte excedido','Não foi possível ler o tempo compartilhado'
  ],
  nl:[
    'Halftone-instellingen',
    'Kies de kleuren en optionele diepte-effecten. De overgang van stippen langs de rand blijft zwart.',
    'Kleuren','Achtergrondkleur','Tekstkleur','Tijd en temperatuur','Weerbron: wachten op gegevens',
    'Temperatuureenheden van Pebble volgen','12-uursnotatie','Temperatuur in Fahrenheit',
    'Fahrenheit geldt als de eenheden van Pebble uitstaan. Gedeeld weer gebruikt de opgeslagen locaties van Pebble; oudere apps gebruiken de huidige telefoonlocatie.',
    'Weerlocatie','Eerste weerlocatie van Pebble','Weerdetails',
    'Minimum en maximum van vandaag tonen','Regen- / sneeuwkans van vandaag tonen',
    'Gebruikt het gedeelde weer van Pebble. min/max geeft het minimum en maximum van vandaag aan; N de neerslagkans. Ontbrekende gegevens blijven verborgen. De details verdwijnen zolang Timeline Peek zichtbaar is.',
    'Tekstgrootte','Extra grote tekst van rand tot rand','Optische effecten','Stippenovergang in 4 stappen','Zwevende tekstschaduw','Instellingen opslaan',
    'Gedeelde actuele weersomstandigheden van Pebble','Compatibele weerbron','Ontvangen: {temperature}',
    'Bron voor het laatst gelezen {minutes} min geleden','Opgeslagen locatie (momenteel niet beschikbaar)','Bronfout: {error}',
    'Locatietoegang geweigerd','Gedeeld weer niet beschikbaar','Lezen van de bron duurde te lang','Gedeeld weer kon niet worden gelezen'
  ],
  pl:[
    'Ustawienia Halftone',
    'Wybierz kolory i opcjonalne efekty głębi. Przejście z kropek przy ramce pozostaje czarne.',
    'Kolory','Kolor tła','Kolor tekstu','Czas i temperatura','Źródło pogody: oczekiwanie na dane',
    'Używaj jednostek temperatury Pebble','Format 12-godzinny','Temperatura w Fahrenheitach',
    'Fahrenheity są używane, gdy jednostki Pebble są wyłączone. Wspólna pogoda używa miejsc zapisanych w Pebble; starsze aplikacje używają bieżącej lokalizacji telefonu.',
    'Miejsce prognozy pogody','Pierwsze miejsce pogody w Pebble','Szczegóły pogody',
    'Pokaż dzisiejszą temperaturę minimalną i maksymalną','Pokaż dzisiejsze prawdopodobieństwo deszczu / śniegu',
    'Używa wspólnej pogody Pebble. min/max oznacza dzisiejszą temperaturę minimalną i maksymalną; O prawdopodobieństwo opadów. Brakujące dane są ukryte. Szczegóły są ukrywane podczas wyświetlania Timeline Peek.',
    'Rozmiar tekstu','Bardzo duży tekst od krawędzi do krawędzi','Efekty optyczne','Przejście z kropek w 4 etapach','Cień unoszącego się tekstu','Zapisz ustawienia',
    'Wspólne aktualne warunki pogodowe Pebble','Zgodne źródło pogody','Odebrano: {temperature}',
    'Ostatni odczyt źródła {minutes} min temu','Zapisane miejsce (obecnie niedostępne)','Błąd źródła: {error}',
    'Odmowa dostępu do lokalizacji','Wspólna pogoda jest niedostępna','Przekroczono czas odczytu źródła','Nie udało się odczytać wspólnej pogody'
  ],
  da:[
    'Halftone-indstillinger',
    'Vælg farver og valgfrie dybdeeffekter. Den prikkede overgang til rammen forbliver sort.',
    'Farver','Baggrundsfarve','Tekstfarve','Tid og temperatur','Vejrkilde: venter på data',
    'Følg temperaturenhederne i Pebble','12-timersformat','Temperatur i Fahrenheit',
    'Fahrenheit bruges, når temperaturenhederne i Pebble ikke følges. Fælles vejrdata bruger gemte steder i Pebble; ældre apps bruger telefonens aktuelle position.',
    'Vejrplacering','Første vejrplacering i Pebble','Vejrdetaljer',
    'Vis dagens laveste og højeste temperatur','Vis dagens sandsynlighed for regn / sne',
    'Bruger fælles vejrdata fra Pebble. min/maks viser dagens laveste/højeste temperatur; N viser sandsynligheden for nedbør. Manglende data skjules. Detaljer skjules, mens Timeline Peek vises.',
    'Tekststørrelse','Ekstra stor tekst fra kant til kant','Optiske effekter','Prikovergang i 4 trin','Svævende tekstskygge','Gem indstillinger',
    'Fælles aktuelle vejrdata fra Pebble','Vejr i kompatibilitetstilstand','Modtaget {temperature}',
    'Seneste aflæsning af kilden for {minutes} min siden','Gemt sted (ikke tilgængeligt lige nu)','Kildefejl: {error}',
    'Adgang til placering afvist','Fælles vejrdata er ikke tilgængelige','Aflæsning af kilden tog for lang tid','Kunne ikke hente fælles vejrdata'
  ],
  sv:[
    'Halftone-inställningar',
    'Välj färger och valfria djupeffekter. Den prickiga övergången till ramen förblir svart.',
    'Färger','Bakgrundsfärg','Textfärg','Tid och temperatur','Väderkälla: väntar på data',
    'Följ temperaturenheterna i Pebble','12-timmarsformat','Temperatur i Fahrenheit',
    'Fahrenheit används när temperaturenheterna i Pebble inte följs. Delade väderdata använder sparade platser i Pebble; äldre appar använder telefonens aktuella plats.',
    'Väderplats','Första väderplatsen i Pebble','Väderdetaljer',
    'Visa dagens lägsta och högsta temperatur','Visa dagens sannolikhet för regn / snö',
    'Använder delade väderdata från Pebble. min/max visar dagens lägsta/högsta temperatur; N visar sannolikheten för nederbörd. Saknade data döljs. Detaljer döljs när Timeline Peek visas.',
    'Textstorlek','Extra stor text från kant till kant','Optiska effekter','Prickövergång i 4 steg','Svävande textskugga','Spara inställningar',
    'Delade aktuella väderdata från Pebble','Väder i kompatibilitetsläge','Mottaget {temperature}',
    'Senaste läsning av källan för {minutes} min sedan','Sparad plats (inte tillgänglig just nu)','Källfel: {error}',
    'Platsåtkomst nekad','Delade väderdata är inte tillgängliga','Läsningen av källan tog för lång tid','Kunde inte läsa delade väderdata'
  ],
  no:[
    'Halftone-innstillinger',
    'Velg farger og valgfrie dybdeeffekter. Den prikkete overgangen til rammen forblir svart.',
    'Farger','Bakgrunnsfarge','Tekstfarge','Tid og temperatur','Værkilde: venter på data',
    'Følg temperaturenhetene i Pebble','12-timersformat','Temperatur i Fahrenheit',
    'Fahrenheit brukes når temperaturenhetene i Pebble ikke følges. Delte værdata bruker lagrede steder i Pebble; eldre apper bruker telefonens nåværende posisjon.',
    'Værsted','Første værsted i Pebble','Værdetaljer',
    'Vis dagens laveste og høyeste temperatur','Vis dagens sannsynlighet for regn / snø',
    'Bruker delte værdata fra Pebble. min/maks viser dagens laveste/høyeste temperatur; N viser sannsynligheten for nedbør. Manglende data skjules. Detaljene skjules mens Timeline Peek vises.',
    'Tekststørrelse','Ekstra stor tekst fra kant til kant','Optiske effekter','Prikkovergang i 4 trinn','Svevende tekstskygge','Lagre innstillinger',
    'Delte aktuelle værdata fra Pebble','Vær i kompatibilitetsmodus','Mottatt {temperature}',
    'Siste avlesning av kilden var for {minutes} min siden','Lagret sted (utilgjengelig akkurat nå)','Kildefeil: {error}',
    'Tilgang til posisjon avslått','Delte værdata er utilgjengelige','Avlesningen av kilden tok for lang tid','Kunne ikke lese delte værdata'
  ],
  fi:[
    'Halftone-asetukset',
    'Valitse värit ja haluamasi syvyystehosteet. Rasteroitu siirtymä kehykseen pysyy mustana.',
    'Värit','Taustaväri','Tekstin väri','Aika ja lämpötila','Säätietojen lähde: odotetaan tietoja',
    'Käytä Pebble-sovelluksen lämpötilayksikköä','12 tunnin kellonaika','Lämpötila Fahrenheit-asteina',
    'Fahrenheit on käytössä, kun Pebble-sovelluksen yksikköä ei käytetä. Jaetut säätiedot käyttävät Pebble-sovellukseen tallennettuja sijainteja; vanhemmat sovellukset käyttävät puhelimen nykyistä sijaintia.',
    'Säätietojen sijainti','Ensimmäinen sääsijainti Pebble-sovelluksessa','Sään lisätiedot',
    'Näytä päivän alin ja ylin lämpötila','Näytä päivän sateen / lumisateen todennäköisyys',
    'Käyttää Pebble-sovelluksen jaettuja säätietoja. alin/ylin näyttävät päivän alimman/ylimmän lämpötilan; S näyttää sateen todennäköisyyden. Puuttuvat tiedot piilotetaan. Lisätiedot piilotetaan, kun Timeline Peek on näkyvissä.',
    'Tekstin koko','Erittäin suuri teksti reunasta reunaan','Optiset tehosteet','4-portainen pistesiirtymä','Leijuva tekstivarjo','Tallenna asetukset',
    'Pebble-sovelluksen jaetut nykyiset säätiedot','Yhteensopivuustilan sää','Vastaanotettu {temperature}',
    'Lähde luettiin viimeksi {minutes} min sitten','Tallennettu sijainti (ei nyt käytettävissä)','Lähdevirhe: {error}',
    'Sijaintilupa evätty','Jaettuja säätietoja ei ole saatavilla','Lähteen lukemisen aikaraja ylittyi','Jaettuja säätietoja ei voitu lukea'
  ],
  hu:[
    'Halftone beállításai',
    'Válaszd ki a színeket és a kívánt mélységhatásokat. A kerethez vezető raszteres átmenet fekete marad.',
    'Színek','Háttérszín','Szövegszín','Idő és hőmérséklet','Időjárási adatforrás: várakozás az adatokra',
    'A Pebble hőmérsékleti egységének követése','12 órás időformátum','Hőmérséklet Fahrenheitben',
    'A Fahrenheit akkor érvényes, ha nem követed a Pebble egységeit. A megosztott időjárás a Pebble-ben mentett helyeket használja; a régebbi alkalmazások a telefon aktuális helyét.',
    'Időjárás helye','A Pebble első időjárási helye','Időjárási részletek',
    'A mai minimum és maximum megjelenítése','A mai eső / havazás esélyének megjelenítése',
    'A Pebble megosztott időjárási adatait használja. A min/max a mai minimumot/maximumot, a Cs a csapadék valószínűségét mutatja. A hiányzó adatok rejtve maradnak. A részletek rejtve maradnak, amíg a Timeline Peek látható.',
    'Szövegméret','Extra nagy szöveg széltől szélig','Optikai hatások','4 lépcsős pontátmenet','Lebegő szövegárnyék','Beállítások mentése',
    'A Pebble megosztott aktuális időjárása','Időjárás kompatibilitási módban','Fogadva: {temperature}',
    'Az adatforrás utolsó lekérése {minutes} perce','Mentett hely (jelenleg nem érhető el)','Adatforráshiba: {error}',
    'Helyhozzáférés megtagadva','A megosztott időjárás nem érhető el','Az adatforrás lekérése túllépte az időkorlátot','Nem sikerült lekérni a megosztott időjárást'
  ],
  ro:[
    'Setări Halftone',
    'Alege culorile și efectele opționale de adâncime. Tranziția punctată spre ramă rămâne neagră.',
    'Culori','Culoare fundal','Culoare text','Oră și temperatură','Sursă meteo: se așteaptă date',
    'Folosește unitățile de temperatură din Pebble','Format de 12 ore','Temperatură în Fahrenheit',
    'Fahrenheit se aplică atunci când nu sunt urmate unitățile Pebble. Datele meteo partajate folosesc locațiile salvate în Pebble; aplicațiile mai vechi folosesc locația actuală a telefonului.',
    'Locație meteo','Prima locație meteo din Pebble','Detalii meteo',
    'Arată minima și maxima de azi','Arată probabilitatea de ploaie / ninsoare de azi',
    'Folosește datele meteo partajate de Pebble. min/max arată minima/maxima de azi; P arată probabilitatea de precipitații. Datele lipsă rămân ascunse. Detaliile sunt ascunse cât timp este vizibil Timeline Peek.',
    'Dimensiune text','Text foarte mare, de la o margine la alta','Efecte optice','Tranziție cu puncte în 4 pași','Umbră pentru text plutitor','Salvează setările',
    'Condiții actuale partajate de Pebble','Meteo în modul de compatibilitate','Primit: {temperature}',
    'Ultima citire a sursei acum {minutes} min','Locație salvată (indisponibilă momentan)','Eroare de sursă: {error}',
    'Accesul la locație a fost refuzat','Datele meteo partajate nu sunt disponibile','Citirea sursei a depășit timpul limită','Nu s-au putut citi datele meteo partajate'
  ],
  tr:[
    'Halftone Ayarları',
    'Renkleri ve isteğe bağlı derinlik efektlerini seçin. Çerçeveye doğru noktalı geçiş siyah kalır.',
    'Renkler','Arka plan rengi','Metin rengi','Saat ve sıcaklık','Hava durumu kaynağı: veri bekleniyor',
    'Pebble sıcaklık birimini izle','12 saat biçimi','Fahrenheit cinsinden sıcaklık',
    "Pebble birimini izleme kapalıyken Fahrenheit kullanılır. Paylaşılan hava durumu, Pebble'da kayıtlı konumları; eski uygulamalar ise telefonun mevcut konumunu kullanır.",
    'Hava durumu konumu',"Pebble'daki ilk hava durumu konumu",'Hava durumu ayrıntıları',
    'Bugünün en düşük ve en yüksek sıcaklığını göster','Bugünün yağmur / kar olasılığını göster',
    "Pebble'ın paylaşılan hava durumu verilerini kullanır. min/maks bugünün en düşük/en yüksek sıcaklığını; Y yağış olasılığını gösterir. Eksik veriler gizlenir. Timeline Peek görünürken ayrıntılar gizlenir.",
    'Metin boyutu','Kenardan kenara ekstra büyük metin','Optik efektler','4 aşamalı nokta geçişi','Yüzen metin gölgesi','Ayarları kaydet',
    "Pebble'dan paylaşılan güncel hava durumu",'Uyumluluk modunda hava durumu','Alınan: {temperature}',
    'Kaynak {minutes} dk önce okundu','Kayıtlı konum (şu anda kullanılamıyor)','Kaynak hatası: {error}',
    'Konum izni reddedildi','Paylaşılan hava durumu kullanılamıyor','Kaynak okuma zaman aşımına uğradı','Paylaşılan hava durumu okunamadı'
  ]
};

// Append new settings so the existing catalogue indices remain stable.
KEYS = KEYS.concat(['layout','layoutStyle','layoutClassic','layoutComic','layoutStacked','layoutHelp']);
var LAYOUT_ROWS = {
  en:['Layout','Layout style','Classic','Comic cover','Stacked time',
    'Comic cover keeps a wide clock with a weather column. Stacked time puts hours above minutes. Timeline Peek uses a compact clock.'],
  cs:['Rozložení','Styl rozložení','Klasické','Komiksová obálka','Čas pod sebou',
    'Komiksová obálka zachovává široké zobrazení času a sloupec s počasím. Čas pod sebou zobrazuje hodiny nad minutami. Při Timeline Peek se čas zobrazí kompaktně.'],
  sk:['Rozloženie','Štýl rozloženia','Klasické','Komiksová obálka','Čas pod sebou',
    'Komiksová obálka zachováva široké zobrazenie času a stĺpec s počasím. Čas pod sebou zobrazuje hodiny nad minútami. Pri Timeline Peek sa čas zobrazí kompaktne.'],
  de:['Anordnung','Art der Anordnung','Klassisch','Comic-Cover','Zeit untereinander',
    'Comic-Cover zeigt eine breite Uhrzeit mit einer Wetterspalte. Zeit untereinander zeigt die Stunden über den Minuten. Timeline Peek verwendet eine kompakte Uhrzeit.'],
  fr:['Disposition','Style de disposition','Classique','Couverture de BD','Heure sur deux lignes',
    'Couverture de BD conserve une heure large avec une colonne météo. Heure sur deux lignes place les heures au-dessus des minutes. Timeline Peek utilise une heure compacte.'],
  es:['Distribución','Estilo de distribución','Clásico','Portada de cómic','Hora en dos líneas',
    'Portada de cómic mantiene un reloj ancho junto a una columna del tiempo. Hora en dos líneas coloca las horas sobre los minutos. Timeline Peek usa un reloj compacto.'],
  it:['Disposizione','Stile della disposizione','Classico','Copertina a fumetti','Ora su due righe',
    'Copertina a fumetti mantiene un orologio largo con una colonna meteo. Ora su due righe dispone le ore sopra i minuti. Timeline Peek usa un orologio compatto.'],
  pt:['Disposição','Estilo da disposição','Clássico','Capa de quadrinhos','Hora em duas linhas',
    'Capa de quadrinhos mantém um relógio largo com uma coluna do tempo. Hora em duas linhas coloca as horas acima dos minutos. O Timeline Peek usa um relógio compacto.'],
  nl:['Indeling','Stijl van de indeling','Klassiek','Stripomslag','Tijd onder elkaar',
    'Stripomslag behoudt een brede klok met een weerkolom. Tijd onder elkaar zet de uren boven de minuten. Timeline Peek gebruikt een compacte klok.'],
  pl:['Układ','Styl układu','Klasyczny','Okładka komiksu','Godziny nad minutami',
    'Okładka komiksu zachowuje szeroki zegar z kolumną pogody. Układ pionowy umieszcza godziny nad minutami. Timeline Peek używa kompaktowego zegara.'],
  da:['Layout','Layoutstil','Klassisk','Tegneserieforside','Tid i to rækker',
    'Tegneserieforside har et bredt ur med en vejrkolonne. Tid i to rækker viser timer over minutter. Timeline Peek bruger et kompakt ur.'],
  sv:['Layout','Layoutstil','Klassisk','Serietidningsomslag','Tid i två rader',
    'Serietidningsomslag har en bred klocka med en väderkolumn. Tid i två rader visar timmar ovanför minuter. Timeline Peek använder en kompakt klocka.'],
  no:['Oppsett','Oppsettstil','Klassisk','Tegneserieomslag','Tid i to rader',
    'Tegneserieomslag har en bred klokke med en værkolonne. Tid i to rader viser timer over minutter. Timeline Peek bruker en kompakt klokke.'],
  fi:['Asettelu','Asettelutyyli','Perinteinen','Sarjakuvakansi','Kellonaika allekkain',
    'Sarjakuvakansi näyttää leveän kellon ja sääsarakkeen. Kellonaika allekkain näyttää tunnit minuuttien yläpuolella. Timeline Peek käyttää pienikokoista kelloa.'],
  hu:['Elrendezés','Elrendezési stílus','Klasszikus','Képregényborító','Óra és perc egymás alatt',
    'A Képregényborító széles órát és időjárási oszlopot jelenít meg. Az Óra és perc egymás alatt az órákat a percek fölé helyezi. A Timeline Peek kompakt órát használ.'],
  ro:['Aspect','Stil de afișare','Clasic','Copertă de benzi desenate','Oră pe două rânduri',
    'Stilul Copertă de benzi desenate păstrează un ceas lat și o coloană meteo. Oră pe două rânduri afișează orele deasupra minutelor. Timeline Peek folosește un ceas compact.'],
  tr:['Düzen','Düzen stili','Klasik','Çizgi roman kapağı','Dikey saat',
    'Çizgi roman kapağı, geniş bir saat ve hava durumu sütunu sunar. Dikey saat, saat hanesini dakika hanesinin üstüne yerleştirir. Timeline Peek kompakt bir saat kullanır.']
};
Object.keys(LAYOUT_ROWS).forEach(function(language) { ROWS[language] = ROWS[language].concat(LAYOUT_ROWS[language]); });

var LANGUAGES = ['en','cs','sk','de','fr','es','it','pt','nl','pl','da','sv','no','fi','hu','ro','tr'];
var LITERALS = Object.create(null);
ROWS.en.forEach(function(value, index) { LITERALS[value] = index; });

function normalizeLanguage(locale) {
  if (typeof locale !== 'string') { return ''; }
  var base = locale.trim().toLowerCase().split(/[.@]/)[0].replace(/_/g, '-').split('-')[0];
  if (base === 'nb' || base === 'nn') { base = 'no'; }
  return LANGUAGES.indexOf(base) >= 0 ? base : '';
}
function resolveLanguage(watchLanguage, phoneLanguage) {
  return normalizeLanguage(watchLanguage) || normalizeLanguage(phoneLanguage) || 'en';
}
function t(key, language, params) {
  var index = KEYS.indexOf(key);
  if (index < 0 && Object.prototype.hasOwnProperty.call(LITERALS, key)) { index = LITERALS[key]; }
  var row = ROWS[resolveLanguage(language)];
  var text = index >= 0 ? row && row[index] || ROWS.en[index] : String(key);
  return text.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, function(match, name) {
    return params && Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match;
  });
}
function translateConfig(config, language) {
  function clone(value, context) {
    if (Array.isArray(value)) { return value.map(function(item) { return clone(item, context); }); }
    if (!value || typeof value !== 'object') { return value; }
    var result = {};
    var type = value.type || context.type;
    var messageKey = value.messageKey || context.messageKey;
    Object.keys(value).forEach(function(key) {
      if (key === 'label' && typeof value[key] === 'string') {
        // Saved place names are user data, even if one happens to be "Colors".
        result[key] = context.option && messageKey === 'WEATHER_LOCATION' && value.value !== ''
          ? value[key] : t(value[key], language);
      } else if (key === 'defaultValue' && typeof value[key] === 'string' &&
          ['text','heading','submit'].indexOf(type) >= 0) {
        result[key] = t(value[key], language);
      } else {
        result[key] = clone(value[key], {type:type, messageKey:messageKey, option:key === 'options'});
      }
    });
    return result;
  }
  return clone(config, {});
}

module.exports = {resolveLanguage:resolveLanguage, translateConfig:translateConfig, t:t, languages:LANGUAGES.slice()};

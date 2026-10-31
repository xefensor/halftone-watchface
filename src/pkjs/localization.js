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
    "High/low is shown as 19/5. The droplet shows today's rain or snow chance. Missing data stays hidden. Details hide during Timeline Peek.",
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
    'Maximum/minimum se zobrazuje jako 19/5. Kapka ukazuje dnešní pravděpodobnost deště nebo sněhu. Chybějící data se nezobrazí. Při Timeline Peek se podrobnosti skryjí.',
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
    'Maximum/minimum sa zobrazuje ako 19/5. Kvapka ukazuje dnešnú pravdepodobnosť dažďa alebo snehu. Chýbajúce údaje sa nezobrazia. Pri Timeline Peek sa podrobnosti skryjú.',
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
    'Die Höchst- und Tiefsttemperatur erscheinen als 19/5. Der Tropfen zeigt die heutige Regen- oder Schneewahrscheinlichkeit. Fehlende Daten bleiben ausgeblendet. Die Details werden während Timeline Peek ausgeblendet.',
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
    "Les températures maximale/minimale s'affichent sous la forme 19/5. La goutte indique le risque de pluie ou de neige aujourd'hui. Les données manquantes restent masquées. Les détails sont masqués pendant Timeline Peek.",
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
    'La máxima/mínima se muestra como 19/5. La gota indica la probabilidad de lluvia o nieve de hoy. Los datos que falten no se muestran. Los detalles se ocultan durante Timeline Peek.',
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
    'La massima/minima è mostrata come 19/5. La goccia indica la probabilità di pioggia o neve di oggi. I dati mancanti restano nascosti. I dettagli si nascondono durante Timeline Peek.',
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
    'A máxima/mínima é exibida como 19/5. A gota mostra a probabilidade de chuva ou neve de hoje. Os dados ausentes ficam ocultos. Os detalhes são ocultados durante o Timeline Peek.',
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
    'Maximum/minimum wordt weergegeven als 19/5. De druppel toont de regen- of sneeuwkans van vandaag. Ontbrekende gegevens blijven verborgen. De details verdwijnen tijdens Timeline Peek.',
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
    'Temperatura maksymalna/minimalna jest pokazywana jako 19/5. Kropla oznacza dzisiejsze prawdopodobieństwo deszczu lub śniegu. Brakujące dane pozostają ukryte. Szczegóły są ukrywane podczas Timeline Peek.',
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
    'Dagens højeste/laveste temperatur vises som 19/5. Dråben viser dagens sandsynlighed for regn eller sne. Manglende data skjules. Detaljer skjules under Timeline Peek.',
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
    'Dagens högsta/lägsta temperatur visas som 19/5. Droppen visar dagens sannolikhet för regn eller snö. Saknade data döljs. Detaljer döljs under Timeline Peek.',
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
    'Dagens høyeste/laveste temperatur vises som 19/5. Dråpen viser dagens sannsynlighet for regn eller snø. Manglende data skjules. Detaljene skjules under Timeline Peek.',
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
    'Päivän ylin/alin lämpötila näkyy muodossa 19/5. Pisara näyttää päivän sateen tai lumisateen todennäköisyyden. Puuttuvat tiedot piilotetaan. Lisätiedot piilotetaan Timeline Peek -näkymän ajaksi.',
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
    'A napi maximum/minimum 19/5 formában jelenik meg. A csepp a mai eső vagy havazás esélyét jelzi. A hiányzó adatok rejtve maradnak. A részletek a Timeline Peek megjelenítése alatt rejtve maradnak.',
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
    'Maxima și minima sunt afișate ca 19/5. Picătura arată probabilitatea de ploaie sau ninsoare de azi. Datele lipsă rămân ascunse. Detaliile sunt ascunse în timpul afișării Timeline Peek.',
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
    'En yüksek/en düşük sıcaklık 19/5 olarak gösterilir. Damla, bugünün yağmur veya kar olasılığını gösterir. Eksik veriler gizlenir. Ayrıntılar Timeline Peek sırasında gizlenir.',
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

KEYS = KEYS.concat(['showWeatherIcon','weatherIconHelp']);
var ICON_ROWS = {
  en:['Show weather icon','Shows the condition supplied by Pebble. Hidden when unavailable.'],
  cs:['Zobrazit ikonu počasí','Zobrazuje stav počasí z Pebble. Pokud není dostupný, ikona se skryje.'],
  sk:['Zobraziť ikonu počasia','Zobrazuje stav počasia z Pebble. Ak nie je dostupný, ikona sa skryje.'],
  de:['Wettersymbol anzeigen','Zeigt den von Pebble gelieferten Wetterzustand. Ist er nicht verfügbar, wird das Symbol ausgeblendet.'],
  fr:["Afficher l’icône météo","Affiche les conditions fournies par Pebble. L’icône reste masquée si elles ne sont pas disponibles."],
  es:['Mostrar el icono del tiempo','Muestra las condiciones proporcionadas por Pebble. El icono se oculta si no están disponibles.'],
  it:["Mostra l’icona meteo","Mostra le condizioni fornite da Pebble. L’icona è nascosta quando non sono disponibili."],
  pt:['Mostrar ícone do tempo','Mostra as condições fornecidas pelo Pebble. O ícone fica oculto quando não estão disponíveis.'],
  nl:['Weericoon tonen','Toont de weersomstandigheden van Pebble. Het icoon blijft verborgen als die niet beschikbaar zijn.'],
  pl:['Pokaż ikonę pogody','Pokazuje warunki pogodowe z Pebble. Ikona jest ukryta, gdy dane są niedostępne.'],
  da:['Vis vejrikon','Viser den vejrtilstand, som Pebble leverer. Skjules, når den ikke er tilgængelig.'],
  sv:['Visa väderikon','Visar vädret enligt Pebble. Döljs om uppgiften saknas.'],
  no:['Vis værikon','Viser værforholdene fra Pebble. Skjules når opplysningene mangler.'],
  fi:['Näytä sääkuvake','Näyttää Pebble-sovelluksen ilmoittaman säätilan. Piilotetaan, jos tietoa ei ole saatavilla.'],
  hu:['Időjárásikon megjelenítése','A Pebble által megadott időjárást mutatja. Adatok hiányában rejtve marad.'],
  ro:['Arată pictograma meteo','Arată starea vremii furnizată de Pebble. Este ascunsă când datele nu sunt disponibile.'],
  tr:['Hava durumu simgesini göster',"Pebble'ın sağladığı hava durumunu gösterir. Bilgi yoksa gizlenir."]
};
Object.keys(ICON_ROWS).forEach(function(language) { ROWS[language] = ROWS[language].concat(ICON_ROWS[language]); });

// Global complication controls append to the catalog so existing indices stay stable.
KEYS = KEYS.concat(['time','complications','complicationsWaiting','complicationsHelp','complicationsUnits',
  'classicSlots','comicSlots','stackedSlots','peekSlots','complicationsStatus','complicationsDisabled',
  'complicationsError','stateOn','stateOff']);
var COMPLICATION_ROWS = {
  en:[
    'Time','Complications','Complications: waiting for Pebble',
    'Choose slots 1–5 in the Pebble app under Settings → Complications. Empty slots keep their positions.',
    'Units come from Pebble and the selected plugin.',
    'Classic: 1 centered; 2/3 above 4/5 in the bottom grid.',
    'Comic cover: 1 large at lower left, 5 above it; 2, 3 and 4 down the right.',
    'Stacked time: 5, 1, 2, 3 and 4 down the right; clock on the left.',
    'Timeline Peek shows only complication 1.',
    'Complications: {ready}/{configured} ready',
    'Enable plugins in Pebble to use complications.',
    'Complication error: {error}','On','Off'
  ],
  cs:[
    'Čas','Komplikace','Komplikace: čeká se na Pebble',
    'Vyberte pozice 1–5 v aplikaci Pebble v Nastavení → Komplikace. Prázdné pozice zůstávají na svém místě.',
    'Jednotky se přebírají z Pebble a vybraného pluginu.',
    'Klasické: 1 uprostřed; 2/3 nad 4/5 v dolní mřížce.',
    'Komiksová obálka: 1 velká vlevo dole, 5 nad ní; 2, 3 a 4 pod sebou vpravo.',
    'Čas pod sebou: 5, 1, 2, 3 a 4 pod sebou vpravo; čas vlevo.',
    'Při Timeline Peek se zobrazuje pouze komplikace 1.',
    'Komplikace: připraveno {ready}/{configured}',
    'Pro používání komplikací zapněte pluginy v Pebble.',
    'Chyba komplikace: {error}','Zapnuto','Vypnuto'
  ],
  sk:[
    'Čas','Komplikácie','Komplikácie: čaká sa na Pebble',
    'Vyberte pozície 1–5 v aplikácii Pebble v Nastavenia → Komplikácie. Prázdne pozície zostávajú na svojom mieste.',
    'Jednotky sa preberajú z Pebble a vybraného pluginu.',
    'Klasické: 1 uprostred; 2/3 nad 4/5 v dolnej mriežke.',
    'Komiksová obálka: 1 veľká vľavo dole, 5 nad ňou; 2, 3 a 4 pod sebou vpravo.',
    'Čas pod sebou: 5, 1, 2, 3 a 4 pod sebou vpravo; čas vľavo.',
    'Pri Timeline Peek sa zobrazuje iba komplikácia 1.',
    'Komplikácie: pripravených {ready}/{configured}',
    'Na používanie komplikácií zapnite pluginy v Pebble.',
    'Chyba komplikácie: {error}','Zapnuté','Vypnuté'
  ],
  de:[
    'Uhrzeit','Komplikationen','Komplikationen: Warten auf Pebble',
    'Wähle die Plätze 1–5 in der Pebble-App unter Einstellungen → Komplikationen. Leere Plätze behalten ihre Position.',
    'Die Einheiten kommen von Pebble und dem gewählten Plugin.',
    'Klassisch: 1 mittig; 2/3 über 4/5 im unteren Raster.',
    'Comic-Cover: 1 groß unten links, 5 darüber; 2, 3 und 4 rechts untereinander.',
    'Zeit untereinander: 5, 1, 2, 3 und 4 rechts untereinander; Uhrzeit links.',
    'Timeline Peek zeigt nur Komplikation 1.',
    'Komplikationen: {ready}/{configured} bereit',
    'Aktiviere Plugins in Pebble, um Komplikationen zu nutzen.',
    'Komplikationsfehler: {error}','Ein','Aus'
  ],
  fr:[
    'Heure','Complications','Complications : en attente de Pebble',
    'Choisissez les emplacements 1–5 dans l’application Pebble sous Réglages → Complications. Les emplacements vides gardent leur position.',
    'Les unités proviennent de Pebble et du plugin sélectionné.',
    'Classique : 1 au centre ; 2/3 au-dessus de 4/5 dans la grille du bas.',
    'Couverture de BD : 1 en grand en bas à gauche, 5 au-dessus ; 2, 3 et 4 à droite, de haut en bas.',
    'Heure sur deux lignes : 5, 1, 2, 3 et 4 à droite, de haut en bas ; heure à gauche.',
    'Timeline Peek affiche uniquement la complication 1.',
    'Complications : {ready}/{configured} prêtes',
    'Activez les plugins dans Pebble pour utiliser les complications.',
    'Erreur de complication : {error}','Activé','Désactivé'
  ],
  es:[
    'Hora','Complicaciones','Complicaciones: esperando a Pebble',
    'Elige las posiciones 1–5 en la aplicación Pebble, en Ajustes → Complicaciones. Las posiciones vacías conservan su lugar.',
    'Las unidades proceden de Pebble y del plugin seleccionado.',
    'Clásico: 1 centrada; 2/3 sobre 4/5 en la cuadrícula inferior.',
    'Portada de cómic: 1 grande abajo a la izquierda, 5 encima; 2, 3 y 4 de arriba abajo a la derecha.',
    'Hora en dos líneas: 5, 1, 2, 3 y 4 de arriba abajo a la derecha; hora a la izquierda.',
    'Timeline Peek solo muestra la complicación 1.',
    'Complicaciones: {ready}/{configured} listas',
    'Activa los plugins en Pebble para usar complicaciones.',
    'Error de complicación: {error}','Activado','Desactivado'
  ],
  it:[
    'Ora','Complicazioni','Complicazioni: in attesa di Pebble',
    'Scegli le posizioni 1–5 nell’app Pebble in Impostazioni → Complicazioni. Le posizioni vuote restano al loro posto.',
    'Le unità provengono da Pebble e dal plugin selezionato.',
    'Classico: 1 al centro; 2/3 sopra 4/5 nella griglia in basso.',
    'Copertina a fumetti: 1 grande in basso a sinistra, 5 sopra; 2, 3 e 4 dall’alto in basso a destra.',
    'Ora su due righe: 5, 1, 2, 3 e 4 dall’alto in basso a destra; orologio a sinistra.',
    'Timeline Peek mostra solo la complicazione 1.',
    'Complicazioni: {ready}/{configured} pronte',
    'Abilita i plugin in Pebble per usare le complicazioni.',
    'Errore della complicazione: {error}','Attivato','Disattivato'
  ],
  pt:[
    'Hora','Complicações','Complicações: à espera do Pebble',
    'Escolha as posições 1–5 no aplicativo Pebble em Configurações → Complicações. As posições vazias mantêm seu lugar.',
    'As unidades vêm do Pebble e do plugin selecionado.',
    'Clássico: 1 no centro; 2/3 acima de 4/5 na grade inferior.',
    'Capa de quadrinhos: 1 grande embaixo à esquerda, 5 acima; 2, 3 e 4 de cima para baixo à direita.',
    'Hora em duas linhas: 5, 1, 2, 3 e 4 de cima para baixo à direita; relógio à esquerda.',
    'O Timeline Peek mostra apenas a complicação 1.',
    'Complicações: {ready}/{configured} prontas',
    'Ative os plugins no Pebble para usar complicações.',
    'Erro de complicação: {error}','Ativado','Desativado'
  ],
  nl:[
    'Tijd','Complicaties','Complicaties: wachten op Pebble',
    'Kies posities 1–5 in de Pebble-app onder Instellingen → Complicaties. Lege posities behouden hun plaats.',
    'De eenheden komen van Pebble en de gekozen plugin.',
    'Klassiek: 1 in het midden; 2/3 boven 4/5 in het onderste raster.',
    'Stripomslag: 1 groot linksonder, 5 erboven; 2, 3 en 4 rechts onder elkaar.',
    'Tijd onder elkaar: 5, 1, 2, 3 en 4 rechts onder elkaar; klok links.',
    'Timeline Peek toont alleen complicatie 1.',
    'Complicaties: {ready}/{configured} gereed',
    'Schakel plugins in Pebble in om complicaties te gebruiken.',
    'Complicatiefout: {error}','Aan','Uit'
  ],
  pl:[
    'Czas','Komplikacje','Komplikacje: oczekiwanie na Pebble',
    'Wybierz pozycje 1–5 w aplikacji Pebble w Ustawienia → Komplikacje. Puste pozycje pozostają na swoim miejscu.',
    'Jednostki pochodzą z Pebble i wybranej wtyczki.',
    'Klasyczny: 1 pośrodku; 2/3 nad 4/5 w dolnej siatce.',
    'Okładka komiksu: 1 duża na dole po lewej, 5 nad nią; 2, 3 i 4 po prawej od góry do dołu.',
    'Godziny nad minutami: 5, 1, 2, 3 i 4 po prawej od góry do dołu; zegar po lewej.',
    'Timeline Peek pokazuje tylko komplikację 1.',
    'Komplikacje: gotowe {ready}/{configured}',
    'Włącz wtyczki w Pebble, aby korzystać z komplikacji.',
    'Błąd komplikacji: {error}','Wł.','Wył.'
  ],
  da:[
    'Tid','Komplikationer','Komplikationer: venter på Pebble',
    'Vælg pladserne 1–5 i Pebble-appen under Indstillinger → Komplikationer. Tomme pladser beholder deres position.',
    'Enhederne kommer fra Pebble og det valgte plugin.',
    'Klassisk: 1 i midten; 2/3 over 4/5 i det nederste gitter.',
    'Tegneserieforside: 1 stor nederst til venstre, 5 ovenover; 2, 3 og 4 ned langs højre side.',
    'Tid i to rækker: 5, 1, 2, 3 og 4 ned langs højre side; uret til venstre.',
    'Timeline Peek viser kun komplikation 1.',
    'Komplikationer: {ready}/{configured} klar',
    'Aktivér plugins i Pebble for at bruge komplikationer.',
    'Komplikationsfejl: {error}','Til','Fra'
  ],
  sv:[
    'Tid','Komplikationer','Komplikationer: väntar på Pebble',
    'Välj platserna 1–5 i Pebble-appen under Inställningar → Komplikationer. Tomma platser behåller sin position.',
    'Enheterna kommer från Pebble och det valda insticksprogrammet.',
    'Klassisk: 1 i mitten; 2/3 ovanför 4/5 i det nedre rutnätet.',
    'Serietidningsomslag: 1 stor nere till vänster, 5 ovanför; 2, 3 och 4 nedåt till höger.',
    'Tid i två rader: 5, 1, 2, 3 och 4 nedåt till höger; klockan till vänster.',
    'Timeline Peek visar bara komplikation 1.',
    'Komplikationer: {ready}/{configured} klara',
    'Aktivera insticksprogram i Pebble för att använda komplikationer.',
    'Komplikationsfel: {error}','På','Av'
  ],
  no:[
    'Tid','Komplikasjoner','Komplikasjoner: venter på Pebble',
    'Velg plassene 1–5 i Pebble-appen under Innstillinger → Komplikasjoner. Tomme plasser beholder posisjonen sin.',
    'Enhetene kommer fra Pebble og det valgte programtillegget.',
    'Klassisk: 1 i midten; 2/3 over 4/5 i det nederste rutenettet.',
    'Tegneserieomslag: 1 stor nede til venstre, 5 over; 2, 3 og 4 nedover til høyre.',
    'Tid i to rader: 5, 1, 2, 3 og 4 nedover til høyre; klokken til venstre.',
    'Timeline Peek viser bare komplikasjon 1.',
    'Komplikasjoner: {ready}/{configured} klare',
    'Aktiver programtillegg i Pebble for å bruke komplikasjoner.',
    'Komplikasjonsfeil: {error}','På','Av'
  ],
  fi:[
    'Aika','Kellon lisätiedot','Lisätiedot: odotetaan Pebbleä',
    'Valitse paikat 1–5 Pebble-sovelluksen kohdasta Asetukset → Kellon lisätiedot. Tyhjät paikat säilyttävät sijaintinsa.',
    'Yksiköt tulevat Pebblestä ja valitusta lisäosasta.',
    'Perinteinen: 1 keskellä; 2/3 paikkojen 4/5 yläpuolella alaruudukossa.',
    'Sarjakuvakansi: 1 suurena alhaalla vasemmalla, 5 sen yläpuolella; 2, 3 ja 4 oikealla allekkain.',
    'Kellonaika allekkain: 5, 1, 2, 3 ja 4 oikealla allekkain; kello vasemmalla.',
    'Timeline Peek näyttää vain lisätiedon 1.',
    'Lisätiedot: {ready}/{configured} valmiina',
    'Ota lisäosat käyttöön Pebblessä, jotta voit näyttää lisätietoja.',
    'Lisätietovirhe: {error}','Päällä','Pois'
  ],
  hu:[
    'Idő','Komplikációk','Komplikációk: várakozás a Pebble-re',
    'Válaszd ki az 1–5. helyet a Pebble alkalmazás Beállítások → Komplikációk menüjében. Az üres helyek nem változtatják meg a pozíciójukat.',
    'A mértékegységeket a Pebble és a kiválasztott bővítmény adja meg.',
    'Klasszikus: 1 középen; 2/3 a 4/5 fölött az alsó rácsban.',
    'Képregényborító: 1 nagy méretben bal alul, 5 fölötte; 2, 3 és 4 jobbra egymás alatt.',
    'Óra és perc egymás alatt: 5, 1, 2, 3 és 4 jobbra egymás alatt; az óra balra.',
    'A Timeline Peek csak az 1. komplikációt mutatja.',
    'Komplikációk: {ready}/{configured} kész',
    'A komplikációk használatához engedélyezd a bővítményeket a Pebble-ben.',
    'Komplikációhiba: {error}','Be','Ki'
  ],
  ro:[
    'Oră','Complicații','Complicații: se așteaptă Pebble',
    'Alege pozițiile 1–5 în aplicația Pebble, la Setări → Complicații. Pozițiile goale își păstrează locul.',
    'Unitățile provin de la Pebble și de la extensia selectată.',
    'Clasic: 1 în centru; 2/3 deasupra lui 4/5 în grila de jos.',
    'Copertă de benzi desenate: 1 mare în stânga jos, 5 deasupra; 2, 3 și 4 în dreapta, de sus în jos.',
    'Oră pe două rânduri: 5, 1, 2, 3 și 4 în dreapta, de sus în jos; ceasul în stânga.',
    'Timeline Peek afișează doar complicația 1.',
    'Complicații: {ready}/{configured} pregătite',
    'Activează extensiile în Pebble pentru a folosi complicații.',
    'Eroare de complicație: {error}','Pornit','Oprit'
  ],
  tr:[
    'Saat','Komplikasyonlar','Komplikasyonlar: Pebble bekleniyor',
    'Pebble uygulamasında Ayarlar → Komplikasyonlar altında 1–5 yuvalarını seçin. Boş yuvalar yerlerini korur.',
    'Birimler Pebble ve seçilen eklentiden alınır.',
    'Klasik: 1 ortada; alt ızgarada 2/3, 4/5 üzerinde.',
    'Çizgi roman kapağı: 1 sol altta büyük, 5 üstünde; 2, 3 ve 4 sağda alt alta.',
    'Dikey saat: sağda alt alta 5, 1, 2, 3 ve 4; saat solda.',
    'Timeline Peek yalnızca 1. komplikasyonu gösterir.',
    'Komplikasyonlar: {ready}/{configured} hazır',
    'Komplikasyonları kullanmak için Pebble’da eklentileri etkinleştirin.',
    'Komplikasyon hatası: {error}','Açık','Kapalı'
  ]
};
Object.keys(COMPLICATION_ROWS).forEach(function(language) {
  ROWS[language] = ROWS[language].concat(COMPLICATION_ROWS[language]);
});

// One adaptive composition replaces the old style picker. Keep the historical
// translation indices above intact for saved settings and older diagnostics.
KEYS = KEYS.concat(['adaptiveLayout','adaptiveHelp','adaptivePeek','dynamicContent',
  'showMusic','showNotifications','notificationPreview','notificationApps',
  'notificationAppsHelp','notificationsHelp','showStatus','contextWaiting','contextReady','contextError']);
var CONTEXT_ROWS = {
  en:[
    'Adaptive layout',
    'The clock stays in place. Complication 1 stays visible; music and new notifications replace slots 2–5.',
    'Timeline Peek keeps the clock and complication 1; secondary readings, music and notification summaries hide.',
    'Dynamic content','Show music while playing','Show new notification summaries','Include message text','Apps to show',
    'App names separated by commas, for example Signal, WhatsApp. Leave empty for all allowed apps.',
    'Uses notifications currently on the phone. Existing notifications are not replayed. Allow access in Pebble.',
    'Show low battery and connection indicators','Dynamic content: waiting for Pebble','Dynamic content: ready','Dynamic content: {error}'
  ],
  cs:[
    'Přizpůsobivé rozložení',
    'Čas zůstává na svém místě. Komplikace 1 zůstává viditelná; hudba a nová oznámení nahradí pozice 2–5.',
    'Timeline Peek zachová čas a komplikaci 1; ostatní údaje, hudba a souhrny oznámení se skryjí.',
    'Dynamický obsah','Zobrazit hudbu při přehrávání','Zobrazit souhrny nových oznámení','Zahrnout text zprávy','Zobrazené aplikace',
    'Názvy aplikací oddělte čárkami, například Signal, WhatsApp. Prázdné pole povolí všechny aplikace s uděleným přístupem.',
    'Používá oznámení, která jsou právě v telefonu. Starší oznámení se znovu nezobrazují. Přístup povolte v Pebble.',
    'Zobrazit ukazatele slabé baterie a připojení','Dynamický obsah: čeká se na Pebble','Dynamický obsah: připraveno','Dynamický obsah: {error}'
  ],
  sk:[
    'Prispôsobivé rozloženie',
    'Čas zostáva na svojom mieste. Komplikácia 1 zostáva viditeľná; hudba a nové oznámenia nahradia pozície 2–5.',
    'Timeline Peek zachová čas a komplikáciu 1; ostatné údaje, hudba a súhrny oznámení sa skryjú.',
    'Dynamický obsah','Zobraziť hudbu počas prehrávania','Zobraziť súhrny nových oznámení','Zahrnúť text správy','Zobrazené aplikácie',
    'Názvy aplikácií oddeľte čiarkami, napríklad Signal, WhatsApp. Prázdne pole povolí všetky aplikácie s udeleným prístupom.',
    'Používa oznámenia, ktoré sú práve v telefóne. Staršie oznámenia sa znova nezobrazujú. Prístup povoľte v Pebble.',
    'Zobraziť ukazovatele slabej batérie a pripojenia','Dynamický obsah: čaká sa na Pebble','Dynamický obsah: pripravený','Dynamický obsah: {error}'
  ],
  de:[
    'Adaptive Anordnung',
    'Die Uhr bleibt an ihrem Platz. Komplikation 1 bleibt sichtbar; Musik und neue Mitteilungen ersetzen die Plätze 2–5.',
    'Timeline Peek behält Uhr und Komplikation 1 bei; weitere Werte, Musik und Mitteilungsübersichten werden ausgeblendet.',
    'Dynamische Inhalte','Musik während der Wiedergabe anzeigen','Übersichten neuer Mitteilungen anzeigen','Nachrichtentext einbeziehen','Anzuzeigende Apps',
    'App-Namen durch Kommas trennen, zum Beispiel Signal, WhatsApp. Leer lassen, um alle zugelassenen Apps anzuzeigen.',
    'Verwendet die aktuellen Mitteilungen auf dem Telefon. Vorhandene Mitteilungen werden nicht erneut angezeigt. Erlaube den Zugriff in Pebble.',
    'Niedrigen Akkustand und Verbindung anzeigen','Dynamische Inhalte: Warten auf Pebble','Dynamische Inhalte: bereit','Dynamische Inhalte: {error}'
  ],
  fr:[
    'Disposition adaptative',
    'L’heure reste à sa place. La complication 1 reste visible ; la musique et les nouvelles notifications remplacent les emplacements 2–5.',
    'Timeline Peek conserve l’heure et la complication 1 ; les autres données, la musique et les résumés de notifications sont masqués.',
    'Contenu dynamique','Afficher la musique pendant la lecture','Afficher les résumés des nouvelles notifications','Inclure le texte du message','Applications à afficher',
    'Séparez les noms des applications par des virgules, par exemple Signal, WhatsApp. Laissez vide pour toutes les applications autorisées.',
    'Utilise les notifications actuellement sur le téléphone. Les notifications existantes ne sont pas réaffichées. Autorisez l’accès dans Pebble.',
    'Afficher les indicateurs de batterie faible et de connexion','Contenu dynamique : en attente de Pebble','Contenu dynamique : prêt','Contenu dynamique : {error}'
  ],
  es:[
    'Distribución adaptable',
    'El reloj permanece en su sitio. La complicación 1 sigue visible; la música y las nuevas notificaciones sustituyen las posiciones 2–5.',
    'Timeline Peek mantiene el reloj y la complicación 1; oculta los demás datos, la música y los resúmenes de notificaciones.',
    'Contenido dinámico','Mostrar música durante la reproducción','Mostrar resúmenes de nuevas notificaciones','Incluir el texto del mensaje','Aplicaciones que mostrar',
    'Separa los nombres de aplicaciones con comas, por ejemplo Signal, WhatsApp. Déjalo vacío para todas las aplicaciones permitidas.',
    'Usa las notificaciones que están actualmente en el teléfono. Las existentes no se vuelven a mostrar. Permite el acceso en Pebble.',
    'Mostrar indicadores de batería baja y conexión','Contenido dinámico: esperando a Pebble','Contenido dinámico: listo','Contenido dinámico: {error}'
  ],
  it:[
    'Disposizione adattiva',
    'L’orologio resta al suo posto. La complicazione 1 resta visibile; musica e nuove notifiche sostituiscono le posizioni 2–5.',
    'Timeline Peek mantiene l’orologio e la complicazione 1; nasconde gli altri dati, la musica e i riepiloghi delle notifiche.',
    'Contenuti dinamici','Mostra la musica durante la riproduzione','Mostra i riepiloghi delle nuove notifiche','Includi il testo del messaggio','App da mostrare',
    'Separa i nomi delle app con virgole, per esempio Signal, WhatsApp. Lascia vuoto per tutte le app autorizzate.',
    'Usa le notifiche attualmente sul telefono. Le notifiche già presenti non vengono riproposte. Autorizza l’accesso in Pebble.',
    'Mostra gli indicatori di batteria scarica e connessione','Contenuti dinamici: in attesa di Pebble','Contenuti dinamici: pronti','Contenuti dinamici: {error}'
  ],
  pt:[
    'Disposição adaptável',
    'O relógio mantém a posição. A complicação 1 continua visível; a música e as novas notificações substituem as posições 2–5.',
    'O Timeline Peek mantém o relógio e a complicação 1; os demais dados, a música e os resumos de notificações ficam ocultos.',
    'Conteúdo dinâmico','Mostrar música durante a reprodução','Mostrar resumos de novas notificações','Incluir o texto da mensagem','Aplicativos a mostrar',
    'Separe os nomes dos aplicativos com vírgulas, por exemplo Signal, WhatsApp. Deixe vazio para todos os aplicativos permitidos.',
    'Usa as notificações que estão atualmente no telefone. As existentes não são mostradas novamente. Permita o acesso no Pebble.',
    'Mostrar indicadores de bateria fraca e conexão','Conteúdo dinâmico: à espera do Pebble','Conteúdo dinâmico: pronto','Conteúdo dinâmico: {error}'
  ],
  nl:[
    'Adaptieve indeling',
    'De klok blijft op zijn plaats. Complicatie 1 blijft zichtbaar; muziek en nieuwe meldingen vervangen posities 2–5.',
    'Timeline Peek behoudt de klok en complicatie 1; overige gegevens, muziek en meldingsoverzichten worden verborgen.',
    'Dynamische inhoud','Muziek tonen tijdens het afspelen','Overzichten van nieuwe meldingen tonen','Berichttekst opnemen','Te tonen apps',
    'Scheid appnamen met komma’s, bijvoorbeeld Signal, WhatsApp. Laat leeg voor alle toegestane apps.',
    'Gebruikt de huidige meldingen op de telefoon. Bestaande meldingen worden niet opnieuw getoond. Geef toegang in Pebble.',
    'Indicatoren voor lage batterij en verbinding tonen','Dynamische inhoud: wachten op Pebble','Dynamische inhoud: gereed','Dynamische inhoud: {error}'
  ],
  pl:[
    'Dostosowujący się układ',
    'Zegar pozostaje na swoim miejscu. Komplikacja 1 jest stale widoczna; muzyka i nowe powiadomienia zastępują pozycje 2–5.',
    'Timeline Peek zachowuje zegar i komplikację 1; pozostałe dane, muzyka i podsumowania powiadomień są ukrywane.',
    'Treść dynamiczna','Pokazuj muzykę podczas odtwarzania','Pokazuj podsumowania nowych powiadomień','Dołącz tekst wiadomości','Wyświetlane aplikacje',
    'Oddziel nazwy aplikacji przecinkami, na przykład Signal, WhatsApp. Pozostaw puste, aby wyświetlać wszystkie dozwolone aplikacje.',
    'Korzysta z powiadomień obecnych na telefonie. Istniejące powiadomienia nie są pokazywane ponownie. Zezwól na dostęp w Pebble.',
    'Pokazuj wskaźniki niskiego poziomu baterii i połączenia','Treść dynamiczna: oczekiwanie na Pebble','Treść dynamiczna: gotowa','Treść dynamiczna: {error}'
  ],
  da:[
    'Dynamisk layout',
    'Uret bliver på sin plads. Komplikation 1 forbliver synlig; musik og nye notifikationer erstatter pladserne 2–5.',
    'Timeline Peek beholder uret og komplikation 1; øvrige data, musik og notifikationsoversigter skjules.',
    'Dynamisk indhold','Vis musik under afspilning','Vis oversigter over nye notifikationer','Medtag beskedtekst','Apps, der skal vises',
    'Adskil appnavne med kommaer, for eksempel Signal, WhatsApp. Lad feltet være tomt for alle tilladte apps.',
    'Bruger de aktuelle notifikationer på telefonen. Eksisterende notifikationer vises ikke igen. Tillad adgang i Pebble.',
    'Vis indikatorer for lavt batteri og forbindelse','Dynamisk indhold: venter på Pebble','Dynamisk indhold: klar','Dynamisk indhold: {error}'
  ],
  sv:[
    'Adaptiv layout',
    'Klockan stannar på sin plats. Komplikation 1 förblir synlig; musik och nya aviseringar ersätter platserna 2–5.',
    'Timeline Peek behåller klockan och komplikation 1; övriga uppgifter, musik och aviseringssammanfattningar döljs.',
    'Dynamiskt innehåll','Visa musik under uppspelning','Visa sammanfattningar av nya aviseringar','Ta med meddelandetext','Appar att visa',
    'Separera appnamn med kommatecken, till exempel Signal, WhatsApp. Lämna tomt för alla tillåtna appar.',
    'Använder de aviseringar som finns på telefonen. Befintliga aviseringar visas inte igen. Tillåt åtkomst i Pebble.',
    'Visa indikatorer för lågt batteri och anslutning','Dynamiskt innehåll: väntar på Pebble','Dynamiskt innehåll: klart','Dynamiskt innehåll: {error}'
  ],
  no:[
    'Dynamisk oppsett',
    'Klokken beholder plassen sin. Komplikasjon 1 forblir synlig; musikk og nye varsler erstatter plassene 2–5.',
    'Timeline Peek beholder klokken og komplikasjon 1; øvrige opplysninger, musikk og varseloversikter skjules.',
    'Dynamisk innhold','Vis musikk under avspilling','Vis oversikter over nye varsler','Ta med meldingstekst','Apper som skal vises',
    'Skill appnavn med komma, for eksempel Signal, WhatsApp. La feltet stå tomt for alle tillatte apper.',
    'Bruker varslene som finnes på telefonen. Eksisterende varsler vises ikke på nytt. Tillat tilgang i Pebble.',
    'Vis indikatorer for lavt batteri og tilkobling','Dynamisk innhold: venter på Pebble','Dynamisk innhold: klart','Dynamisk innhold: {error}'
  ],
  fi:[
    'Mukautuva asettelu',
    'Kello pysyy paikallaan. Lisätieto 1 pysyy näkyvissä; musiikki ja uudet ilmoitukset korvaavat paikat 2–5.',
    'Timeline Peek säilyttää kellon ja lisätiedon 1; muut tiedot, musiikki ja ilmoitusyhteenvedot piilotetaan.',
    'Muuttuva sisältö','Näytä musiikki toiston aikana','Näytä uusien ilmoitusten yhteenvedot','Sisällytä viestin teksti','Näytettävät sovellukset',
    'Erota sovellusten nimet pilkuilla, esimerkiksi Signal, WhatsApp. Jätä tyhjäksi, jos haluat näyttää kaikki sallitut sovellukset.',
    'Käyttää puhelimessa olevia ilmoituksia. Aiemmat ilmoitukset eivät näy uudelleen. Salli käyttö Pebblessä.',
    'Näytä vähäisen akun ja yhteyden ilmaisimet','Muuttuva sisältö: odotetaan Pebbleä','Muuttuva sisältö: valmis','Muuttuva sisältö: {error}'
  ],
  hu:[
    'Alkalmazkodó elrendezés',
    'Az óra a helyén marad. Az 1. komplikáció látható marad; a zene és az új értesítések a 2–5. helyet váltják fel.',
    'A Timeline Peek megtartja az órát és az 1. komplikációt; a többi adat, a zene és az értesítés-összefoglalók rejtve maradnak.',
    'Változó tartalom','Zene megjelenítése lejátszás közben','Új értesítések összefoglalóinak megjelenítése','Üzenetszöveg megjelenítése','Megjelenített alkalmazások',
    'Az alkalmazásneveket vesszővel válaszd el, például Signal, WhatsApp. Hagyd üresen az összes engedélyezett alkalmazáshoz.',
    'A telefonon jelenleg látható értesítéseket használja. A korábbi értesítéseket nem jeleníti meg újra. Engedélyezd a hozzáférést a Pebble-ben.',
    'Alacsony töltöttség és kapcsolat jelzése','Változó tartalom: várakozás a Pebble-re','Változó tartalom: kész','Változó tartalom: {error}'
  ],
  ro:[
    'Aspect adaptiv',
    'Ceasul rămâne pe loc. Complicația 1 rămâne vizibilă; muzica și notificările noi înlocuiesc pozițiile 2–5.',
    'Timeline Peek păstrează ceasul și complicația 1; celelalte date, muzica și rezumatele notificărilor sunt ascunse.',
    'Conținut dinamic','Arată muzica în timpul redării','Arată rezumatele notificărilor noi','Include textul mesajului','Aplicații de afișat',
    'Separă numele aplicațiilor prin virgule, de exemplu Signal, WhatsApp. Lasă gol pentru toate aplicațiile permise.',
    'Folosește notificările prezente pe telefon. Notificările existente nu sunt afișate din nou. Permite accesul în Pebble.',
    'Arată indicatoarele de baterie slabă și conexiune','Conținut dinamic: se așteaptă Pebble','Conținut dinamic: pregătit','Conținut dinamic: {error}'
  ],
  tr:[
    'Uyarlanabilir düzen',
    'Saat yerinde kalır. 1. komplikasyon görünür kalır; müzik ve yeni bildirimler 2–5 yuvalarının yerini alır.',
    'Timeline Peek saati ve 1. komplikasyonu korur; diğer bilgiler, müzik ve bildirim özetleri gizlenir.',
    'Dinamik içerik','Çalma sırasında müziği göster','Yeni bildirim özetlerini göster','Mesaj metnini dahil et','Gösterilecek uygulamalar',
    'Uygulama adlarını virgülle ayırın, örneğin Signal, WhatsApp. İzin verilen tüm uygulamalar için boş bırakın.',
    'Telefonda bulunan bildirimleri kullanır. Mevcut bildirimler yeniden gösterilmez. Pebble’da erişime izin verin.',
    'Düşük pil ve bağlantı göstergelerini göster','Dinamik içerik: Pebble bekleniyor','Dinamik içerik: hazır','Dinamik içerik: {error}'
  ]
};
Object.keys(CONTEXT_ROWS).forEach(function(language) {
  ROWS[language] = ROWS[language].concat(CONTEXT_ROWS[language]);
});

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

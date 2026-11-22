# PV Lab 0.9.0 — wykonanie planów w HA

Pakiet zawiera tylko zmienione pliki względem 0.8.16. Wgraj zawartość z zachowaniem podkatalogów. Niczego nie usuwaj i nie importuj historii ponownie.

1. Zaktualizuj aplikację oraz integrację HACS do 0.9.0. Uruchom ponownie HA i odśwież dashboard, aby wczytać nową kartę.
2. W Ustawieniach, w konfiguracji zmywarki i pralki, sprawdź pole „Switch do włączenia o zaplanowanej godzinie”. Domyślnie są wpisane podane encje switch.gniazdkopomiarzmywarka i switch.gniazdkopomiarpralka.
3. Zaplanuj cykle, wybierz kłódką tryb i zatwierdź. Od tej wersji nowe zatwierdzenie uzbraja rzeczywiste polecenia turn_on w HA. Starsze zatwierdzenia trzeba anulować i zatwierdzić ponownie; same się nie uzbrajają.
4. Auto od razu zatwierdza jedną partię po jednym cyklu dla urządzeń z wyłączonym switchem. Działa w zaznaczonym zakresie. Nie dodaje nieograniczenie nowych partii.

Czerwony: stałe godziny. Zielony: sprawdzanie lepszzych terminów co 30 minut. Niebieski: elastyczny, ale bez późniejszego końca każdego urządzenia. Ostatnie 15 minut przed startem jest zablokowane. Anuluj rozbraja przyszłe starty; nigdy nie wyłącza urządzeń.

Nie wysyłano poleceń do Twoich urządzeń podczas przygotowywania aktualizacji. Testy korzystają z symulowanych usług HA. Szczegóły restartów, błędów i rejestru poleceń opisano w pełnej instrukcji DOCS.md oraz DASHBOARD-CARD.md.

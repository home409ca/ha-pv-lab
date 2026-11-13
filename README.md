# PV Lab

Aplikacja i integracja Home Assistant do korekty prognoz fotowoltaiki, analizy produkcji i planowania urządzeń. Reguły i obliczenia, bez modelu AI i bez nowej bazy danych.

## Funkcje

- Łączy prognozy Forecast.Solar, Open-Meteo Solar i Solcast. Uwzględnia limit falownika, kalibrację, bieżącą produkcję i sezonowy profil instalacji.
- Porównuje prognozy z rzeczywistą produkcją. Pokazuje błędy i wpływ korekt historycznych.
- Analizuje optymalizatory, napięcia i przestoje. Wysokie napięcie i braki nie są interpretowane jako zacienienie.
- Importuje historię produkcji i optymalizatorów z istniejącej bazy InfluxDB. Uzupełnia historyczny potencjał i obserwacje paneli; nie dubluje danych HA.
- Odczytuje zachowane archiwa Solcast i Open-Meteo do opisowych porównań. Bez potwierdzonego czasu wydania nie używa ich do rankingu horyzontów ani uczenia wag.
- Wskazuje najlepsze okna produkcji 1/2/3 h, planuje pracę urządzeń według profilu i uwzględnia bilansowanie energii.
- Udostępnia encje i prognozę w panelu Energia HA. Archiwum prognozy dla Energii nie jest automatycznie kasowane.

- Optymalizuje koszt pracy urządzeń względem G12w, RCEm i wartości utraconego eksportu. Wspólnie planuje do 8 cykli, pokazuje scenariusze i zapisuje rekomendacje do weryfikacji pomiarami.

## Instalacja i aktualizacja

Dodaj to repozytorium w sklepie dodatków/aplikacji HA, zainstaluj PV Lab i otwórz jego panel. Osobną integrację z katalogu `custom_components/pv_lab` zainstaluj przez HACS, uruchom ponownie HA i sparuj z aplikacją według zakładki „Integracja HA”.

Przy aktualizacji plików repozytorium wgrywaj zawartość przekazanej paczki różnicowej do katalogu głównego, zachowując strukturę. Paczka zawiera tylko zmienione i nowe pliki; nie wymaga usuwania pozostałych. Zadanie GitHub Actions publikuje numerowane wydanie, które HACS może wyświetlić. Zaktualizuj osobno aplikację i integrację.

## Import z InfluxDB

Od wersji 0.6.0 otwórz „Import historii”, wpisz hasło InfluxDB, zapisz połączenie i sprawdź encje. Zacznij od kilku zakończonych dni, obejrzyj wynik, następnie rozszerz zakres. Dostępne są ponowny import, pomijanie zapisanych dni, zatrzymywanie oraz automatyczne uzupełnianie ostatnich trzech dni raz na dobę.

Hasło pozostaje w osobnym pliku `/data/influx-credentials.json`, poza przeglądarką plików i eksportem z panelu. Kopia dodatku HA obejmuje również dane logowania. Dodatek ma dostęp tylko do odczytu katalogu konfiguracji HA do odczytu archiwów prognoz. Parametry początkowe są edytowalne; nie zawierają hasła.

Szczegóły: [instrukcja aplikacji](pv_lab/DOCS.md), [aktualizacja 0.7.1](UPDATE-0.7.1.md), [Optymalizator zużycia energii](ENERGY-OPTIMIZER.md).

Od 0.7.1 wysokie napięcie przy normalnej pracy jest ostrzeżeniem. Końcowa prognoza uwzględnia osobno empiryczne ryzyko przestojów; jego wpływ jest widoczny w panelu. Depozyt jest domyślnie wyłączony, a ręczna RCEm ma wybór PLN/MWh lub PLN/kWh.

## Pełna instrukcja

[Instrukcja wszystkich modułów](pv_lab/DOCS.md) · [wersja HTML do czytania i wydruku](pv_lab/public/manual.html). W aplikacji wybierz „Instrukcja PV Lab”. Instrukcja jest sprawdzana przed publikacją każdego wydania.

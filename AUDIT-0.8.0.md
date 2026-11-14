# Audyt PV Lab 0.8.0

## Zakres i metoda

Przegląd istniejącego projektu: przepływ danych HA i InfluxDB, prognozy i kalibracja, historyczny potencjał, przestoje, archiwum Energii, raporty, profile domu i urządzeń, ceny, bilansowanie, planowanie, zapis, API, integracja HACS i główne ekrany. Nie przebudowano aplikacji i nie dodano zależności. Kontrola obejmuje kod, testy kontraktowe, odtworzenie kopii użytkownika oraz lokalny interfejs na danych kontrolnych. Nie oznacza testu na działającym HA użytkownika ani sprawdzenia jego faktury.

## Naprawione błędy

1. Wspólna nazwa pliku `.tmp` przy równoczesnych zapisach mogła powodować kolizję, błąd przeniesienia lub zapis innej wersji. Kolejka serializuje zapis i utrwala wartości w momencie zlecenia; błąd jednego zapisu nie blokuje kolejnych.
2. Migracja cennika bez znacznika dawnego presetu mogła nadpisać stawki i ustawienia depozytu. Zachowujemy konfigurację użytkownika; nowe konfiguracje nadal otrzymują ustalone wartości domyślne. Nie odtwarzamy automatycznie stawek utraconych przez stare wydania.
3. Tekst z samymi spacjami mógł zostać uznany za zero. Niepoprawna moc mogła zatruć całkę pomiaru. Braki pozostają brakami, a pokrycie przedziału nie rośnie od niepoprawnych mocy.
4. Wadliwa lista encji HA powodowała wewnętrzny błąd `.map`; obecnie jest czytelny komunikat i możliwość ponowienia odczytu.
5. Pamięć podręczna ryzyka sieci była sprawdzana przed progiem energii i zakończeniem kwadransa. Wynik innego przedziału mógł zostać użyty mimo niespełnienia tych warunków. Sprawdzenie warunków odbywa się teraz przed pamięcią podręczną.

Pierwsze cztery scenariusze regresji nie przeszły na 0.7.9; po poprawce przechodzą. Osobny test zabezpiecza granice pamięci podręcznej sieci.

## Sprawdzone obliczenia

- W/kW i Wh/kWh, dzielenie źródeł godzinowych/półgodzinnych na kwadranse bez wymyślonego wygładzania; limit 5500 W = 1375 Wh/kwadrans.
- Prognoza końcowa: kalibracja źródeł, ważenie, bieżąca produkcja, kwalifikowany potencjał całości AC i osobno oczekiwana strata sieciowa. Diagnostyka optymalizatorów nie jest drugim mnożnikiem zacienienia.
- Raporty korzystają z zapisów znanych przed produkcją. Archiwa dostawców bez czasu wydania pozostają opisowe. Roczne pomiary nie udają historycznych prognoz.
- Bilans netto jest dodawany do bieżącego okresu raz; wygasa na jego granicy. Plus w encji salda oznacza eksport. Liczniki i moce sieci mają oddzielne role.
- Cena zakupu to suma skonfigurowanych składników brutto. 439,78 PLN/MWh = 0,43978 PLN/kWh; współczynnik eksportu występuje raz. Depozyt wyłączony daje zerową wartość utraconego eksportu.
- Koszt cyklu jest różnicą między domem z cyklem i bez niego. Dodatkowy import oraz utracony eksport nie są dodawane ponownie do tej samej różnicy.
- Wspólny harmonogram rezerwuje energię innych cykli; dwa niezależne zalecenia nie stają się wspólnym planem. Koszty marginalne nie muszą sumować się do kosztu wspólnego.
- Testy zmiany ceny w trakcie cyklu, brakujących cen/prognoz, limitu mocy, terminów, obu powtórzeń godziny jesiennej i wiosennej zmiany czasu.

Na lokalnej kopii użytkownika odtworzono 14 510 pomiarów i 924 zestawy prognoz. Dla 768 kwadransów wynik liczbowy produkcji przed/po audycie pozostał identyczny; wartości mieściły się w limicie falownika. Kontrolny cykl 1 kWh/60 min dał identyczny wynik optymalizacji po usprawnieniu grupowania. Wynik odnosi się do czasu wykonania kopii, nie bieżącej prognozy. Źródłowa kopia nie była zmieniana ani dołączana do wydania.

## Interfejs

Prognozy: najpierw wykres, najlepsze okna, tabela godzinowa i kolejne dni. Rozwinięcia zawierają źródła, korekty, kontrolę Energii i historię zmian. Optymalizator: najpierw wspólna rekomendacja, potem pomiary i ceny. Konfiguracja, szczegóły cyklu, profil domu, zapisane plany i objaśnienia są rozwijane. Otwarte sekcje zachowują się podczas odświeżania. Nie usunięto opcji ani danych. Uporządkowano opisy kosztów i powtarzające się teksty dymków, zachowano wspólne kolory i skalę dopasowaną do produkcji.

## Porządki i wydajność

Usunięto nieużywany import DAY, martwe obliczenie overlap i warunek zwracający tę samą rozdzielczość w obu gałęziach. Pięciominutowe kroki symulacji są grupowane do kwadransów w jednym przejściu zamiast ponownego filtrowania całej listy. Nie usuwano plików, eksportowanych funkcji bez jednoznacznego dowodu zbędności ani historycznych opisów wydań. Zapis i import nadal używają plików; nie dodano bazy danych.

## Granice i decyzje

Nie ma sprawy wymagającej blokującej decyzji użytkownika. Koszty pozostają symulacją zmiennych opłat przy podanych cenach, a nie fakturą. RCEm dla nieznanego miesiąca jest jawnym założeniem albo ręczną prognozą; kod nie przewiduje jej sam. Nie symulujemy wygasania lub wykorzystania depozytu. Godziny taryfy i ustawienia licznika zależą od umowy. Optymalizator pozostaje heurystyką; scenariusze nie są gwarancją kosztu. Brakujące optymalizatory i nieznana jakość dawnych danych nadal ograniczają diagnostykę.

Kontrolne źródła zasad taryfy i depozytu: [PGE — taryfa dystrybucyjna 2026](https://pgedystrybucja.pl/content/download/15f0a79cad0e85c168cd6b8430b4a2e9/file/tekst-jednolity-od-01.02.2026_taryfa-pge-dystrybucja-na-rok-2026.pdf?contentId=27274&inLanguage=pol-PL&version=3), [PGE — pytania prosumentów](https://www.gkpge.pl/dla-domu/strefa-klienta/przewodnik-prosumenta/pytania-i-odpowiedzi). Nie podmieniano umowy użytkownika ani stawek na podstawie samych wartości przykładowych.

## Inwentaryzacja plików wykonywalnych

38 modułów serwera, 15 modułów przeglądarki, 11 modułów integracji Python.

- `custom_components/pv_lab/__init__.py`
- `custom_components/pv_lab/api.py`
- `custom_components/pv_lab/config_flow.py`
- `custom_components/pv_lab/const.py`
- `custom_components/pv_lab/contract.py`
- `custom_components/pv_lab/datetime.py`
- `custom_components/pv_lab/energy.py`
- `custom_components/pv_lab/number.py`
- `custom_components/pv_lab/plan_entity.py`
- `custom_components/pv_lab/select.py`
- `custom_components/pv_lab/sensor.py`
- `pv_lab/public/app.js`
- `pv_lab/public/appliances.js`
- `pv_lab/public/chart-ranges.js`
- `pv_lab/public/energy-optimizer.js`
- `pv_lab/public/external-history.js`
- `pv_lab/public/grid-risk.js`
- `pv_lab/public/historical.js`
- `pv_lab/public/insights.js`
- `pv_lab/public/numeric-input.js`
- `pv_lab/public/planning.js`
- `pv_lab/public/presentation.js`
- `pv_lab/public/production-hours.js`
- `pv_lab/public/table-help.js`
- `pv_lab/public/view-state.js`
- `pv_lab/public/voltage-analysis.js`
- `pv_lab/src/adapters.mjs`
- `pv_lab/src/appliances.mjs`
- `pv_lab/src/calibration-status.mjs`
- `pv_lab/src/clear-sky.mjs`
- `pv_lab/src/day-state.mjs`
- `pv_lab/src/defaults.mjs`
- `pv_lab/src/demo-potential.mjs`
- `pv_lab/src/demo.mjs`
- `pv_lab/src/energy-archive.mjs`
- `pv_lab/src/energy-readback.mjs`
- `pv_lab/src/energy-status.mjs`
- `pv_lab/src/engine.mjs`
- `pv_lab/src/forecast.mjs`
- `pv_lab/src/grid-risk.mjs`
- `pv_lab/src/ha.mjs`
- `pv_lab/src/historical-profile.mjs`
- `pv_lab/src/house-forecast.mjs`
- `pv_lab/src/influx-history.mjs`
- `pv_lab/src/integration.mjs`
- `pv_lab/src/optimizer-history.mjs`
- `pv_lab/src/optimizer-load.mjs`
- `pv_lab/src/optimizer-settings.mjs`
- `pv_lab/src/optimizer-tariff.mjs`
- `pv_lab/src/optimizer.mjs`
- `pv_lab/src/planner.mjs`
- `pv_lab/src/provider-archive.mjs`
- `pv_lab/src/reports.mjs`
- `pv_lab/src/revisions.mjs`
- `pv_lab/src/server-v2.mjs`
- `pv_lab/src/server.mjs`
- `pv_lab/src/statistics-metadata.mjs`
- `pv_lab/src/statistics.mjs`
- `pv_lab/src/storage.mjs`
- `pv_lab/src/time.mjs`
- `pv_lab/src/validation.mjs`
- `pv_lab/src/version.mjs`
- `pv_lab/src/voltage-analysis.mjs`
- `pv_lab/src/voltage-history.mjs`

## Wynik weryfikacji wydania

193 testy Node oraz 29 testów Python zakończyły się powodzeniem (222 łącznie, bez pominięć). Próba wydania dry-run przeszła bez zapisu na GitHub. W lokalnej przeglądarce sprawdzono 15 głównych zakładek, zapis ceny z przecinkiem i przeliczenie, rozwijanie szczegółów, przełączenie W/kWh przez opcje domu i nadwyżki, aktualną instrukcję oraz szerokość widoku przy 390 px. Brak błędów JavaScript w sprawdzanej sesji. Próby odbywały się na danych kontrolnych, nie w działającej instalacji użytkownika.

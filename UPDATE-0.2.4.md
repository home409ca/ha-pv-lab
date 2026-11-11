# PV Lab 0.2.4 — wizualne porównanie dostawców

W Przeglądzie oraz Prognozach wspólny wykres pokazuje osobno Forecast.Solar (pomarańczowy), Open-Meteo (turkusowy), Solcast (fioletowy) i PV Lab po korektach (zielony). Dostępne są również pomiar rzeczywisty (niebieski) i opcjonalna połączona prognoza bez kalibracji (szary).

Każdą serię można niezależnie włączać i wyłączać. Wybór obowiązuje w otwartym panelu, także podczas automatycznego odświeżania danych i zmiany dnia. Ukrycie serii nie wyłącza dostawcy z obliczeń i nie zmienia wag.

Domyślnie przebiegi dostawców są oryginalne, bez korekt PV Lab. Możesz przełączyć je na porównanie po wspólnym limicie falownika. Wynik PV Lab zawsze zachowuje limit instalacji. Skala obejmuje także wartości oryginalne powyżej limitu; próg jest narysowany osobno. Wartości to średnia moc W w kwadransie. Tabela poniżej nadal pokazuje energię kWh.

Brakujące dane danego dostawcy tworzą lukę w linii i komunikat. Nie są zerową produkcją. Jeśli źródło nie udostępnia wybranego dnia, jego krzywa nie powstanie. Wszystkie linie pokazują aktualnie odczytane wersje prognoz, a nie archiwum prognoz wydanych o tej samej godzinie. Gdy źródła mają identyczne wartości, linie mogą się nakładać — przełączniki pozwalają je obejrzeć osobno.

## Aktualizacja

1. Rozpakuj `pv-lab-update-0.2.4.zip` i wgraj zawartość do głównego katalogu repozytorium GitHub, zastępując pliki. Bez dodatkowego katalogu nadrzędnego.
2. Odśwież sklep aplikacji HA i zaktualizuj aplikację PV Lab do **0.2.4**.
3. Odśwież panel WWW. Na dole menu powinna być wersja 0.2.4.

Dane, ustawienia, klucz parowania i kalibracja pozostają zachowane. Integracja HA nadal ma wersję **0.2.2**; paczka zawiera również poprzednią poprawkę jej widoczności w Energii. Jeśli masz ją już zainstalowaną, nie wymaga kolejnej aktualizacji przez HACS.

## Weryfikacja

53 testy aplikacji przeszły. Nowe przypadki sprawdzają rozdzielenie źródeł, wybór oryginalnej/ograniczonej prognozy, luki i niezależność ukrywania krzywych od wyniku PV Lab. W przeglądarce sprawdzono demonstrację, wyłączenie i ponowne włączenie dostawcy oraz zmianę sposobu prezentacji. Nie wykonywano testu na rzeczywistym HA użytkownika.

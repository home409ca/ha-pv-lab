# Model historyczny

Wdrożenie bez AI i zewnętrznych zależności obliczeniowych. Promieniowanie poziome Haurwitz: GHI = 1098 cos(Z) exp(-0.059/cos(Z)); udział rozproszony według Erbs; izotropowa transpozycja na nachyloną połać i odbicie podłoża z albedo 0.2. Osobna geometria każdej połaci. Całkowanie co 5 minut, współczynnik DC 0.90, sprawność AC 0.97, wspólny limit falownika stosowany przed całkowaniem. Model nie zawiera temperatury ani pomiaru warunków atmosferycznych i jest punktem odniesienia.

Opis równań i ograniczeń:
- https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.clearsky.haurwitz.html
- https://pvlib-python.readthedocs.io/en/stable/reference/generated/pvlib.irradiance.erbs.html
- https://pvpmc.sandia.gov/modeling-guide/1-weather-design-inputs/plane-of-array-poa-irradiance/

Archiwum zachowuje [początek godziny UTC, przyrost kWh, jakość]. Odstające lub ujemne przyrosty odrzucamy. Roczny cykl dat odwzorowany jest na rok przestępny 2000, aby obsłużyć 29 lutego i przejście grudzień/styczeń. Grupujemy podobny czas słoneczny, a nie sztywne godziny letnie i zimowe. Wysoki poziom po normalizacji to ważony percentyl stosunków kWh/model na jasnych pełnych dniach, pomnożony przez model wybranej godziny. Wyłączenia i validFrom są stosowane przed obliczeniami; przeszłe dane nie stają się prognozami znanymi w przeszłości.

Korekta: target = odniesienie * (1 + margines). Gdy suma prognozy godzinowej > target, factor = max(1 - maks_redukcja, 1 - maks_redukcja * pewność * (1 - target/suma)). Ten sam factor skaluje cztery kwadranse. Przy brakującym kwadransie, braku potwierdzonej podstawy AC całości, niezgodnej geometrii lub zbyt małej próbie korekta jest pomijana. Pewność jest ostrożnym wskaźnikiem liczebności, nie prawdopodobieństwem statystycznym. Profile PV1/PV2 nie są mnożone przez prognozę całkowitą i nie odejmujemy strat dwa razy.

# PV Lab 0.8.13

Tylko zmienione pliki od 0.8.12. Wgraj zawartość ZIP do głównego katalogu repozytorium z zachowaniem podkatalogów. Zaktualizuj aplikację oraz integrację HACS, uruchom ponownie HA i odśwież dashboard. Historia i konfiguracja są zachowane, bez ponownego importu.

Karta pokazuje jeden polecany plan. Strzałka rozwija pozostałe: zielona — wszystkie ukryte propozycje bez zakupu po bilansowaniu, pomarańczowa — co najmniej jedna wymaga zakupu. Przy jednym planie strzałki nie ma. Po zatwierdzeniu innego wariantu po zwinięciu pozostaje widoczny zatwierdzony. Kolor ma objaśnienie; nie zmienia rankingu ani bilansowania.

W aplikacji, pod Proponowanymi harmonogramami, są dodatkowe porównania dla każdego dnia zakresu: start w dziennej taniej strefie z zapisanej taryfy oraz początek pełnej godziny największej prognozowanej produkcji PV. Domyślnie tania strefa zaczyna się o 13:00 zimą/15:00 latem. W weekend lub święto tanie przez całą dobę widnieje odpowiednia uwaga. Pełne porównania biorą udział w poszukiwaniu rekomendacji. Wariant już obecny w głównej tabeli ma odnośną informację. Pokaż ten plan otwiera szczegóły i wykres oraz pozwala zapisać plan do weryfikacji.

Miniona godzina, brak prognozy lub niemożność zakończenia cykli są opisane, bez cichego przesunięcia godziny i bez obchodzenia blokad sprzętu. Niepełnego planu nie można zapisać. Gniazdka nadal nie są sterowane.

Ręczny zasób karty: /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.13-dashboard, typ Moduł JavaScript.

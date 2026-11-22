# PV Lab 0.8.12

Tylko zmienione pliki od 0.8.11. Wgraj rozpakowaną zawartość do głównego katalogu repozytorium z zachowaniem podkatalogów. Zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież dashboard. Ustawienia i historia pozostają zachowane; nie trzeba ponawiać importów.

Karta wybiera do trzech pełnych planów z udziałem PV lub bilansu. Filtrujemy kandydatów przed skróceniem listy, wykorzystując znalezione plany obu celów. Przy jednym lub dwóch takich planach karta nie uzupełnia listy wariantami całkowicie płatnymi. Gdy pełnego planu z PV/bilansem nie znaleziono, pokazuje jedną najtańszą znalezioną propozycję, a przy takiej samej cenie najwcześniejszą. Niepełna lub brakująca prognoza nadal jest brakiem danych, nie zerową produkcją.

Pełne porównanie kosztów w aplikacji pozostaje, również z propozycjami wymagającymi zakupu całej energii. Karta celowo filtruje ten widok; nie musi już przedstawiać pierwszych trzech wierszy tabeli aplikacji. Dla jednego urządzenia sprawdzamy wszystkie dopuszczalne starty co 15 minut. Dla kilku cykli wynik pozostaje najlepszym znalezionym, nie gwarantowanym globalnym minimum.

Zatwierdzanie zapisuje dokładnie wybraną propozycję także po odfiltrowaniu innych planów. Gniazdka nie są sterowane. Zapisany stan karty ma maksymalnie trzy plany (lub jeden całkowicie płatny); nie zapisujemy pełnej puli przeszukiwania. Mały dodatni udział PV poniżej 1% pokazujemy do dwóch miejsc po przecinku.

Ręczny zasób karty, jeśli go używasz: /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.12-dashboard, typ Moduł JavaScript.

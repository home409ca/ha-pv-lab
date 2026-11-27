# PV Lab 0.10.6 — zasłonięcie przez kilka dni i encje HA

Tylko zmienione pliki względem 0.10.5, z zachowaniem katalogów. Bez kasowania danych i ustawień.

1. Wgraj pliki do głównego katalogu repozytorium z zachowaniem podkatalogów.
2. Poczekaj na zielone Actions → Publish PV Lab version.
3. Zaktualizuj aplikację i integrację HACS do 0.10.6. Uruchom ponownie HA i odśwież kartę.
4. W Ustawienia → Urządzenia i usługi → PV Lab → urządzenie PV Lab znajdziesz status podejrzenia, przełącznik korekty, wybór encji pogody i przycisk potwierdzenia odsłonięcia. Możesz dodać je do zwykłej karty encji dashboardu.

Nierozwiązane podejrzenie nie znika o północy. Ograniczenie obejmuje też dostępne przyszłe dni prognozy; Auto nie wraca rano do pełnej produkcji. Powrót produkcji przez około 20 minut lub ręczne potwierdzenie odsłonięcia zdejmuje podejrzenie. Ręczne potwierdzenie wymaga nowych pomiarów przed kolejną automatyczną aktywacją. Wyłączenie przełącznika jest trwałe. Pogoda opcjonalna; wybierz lokalną encję weather albo Bez encji pogody. YAML karty bez zmian.

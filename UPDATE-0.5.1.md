# PV Lab 0.5.1

Wgraj całą zawartość pv-lab-update-0.5.1.zip do głównego katalogu repozytorium, razem z .github i scripts, jednym zatwierdzeniem. Po poprawnym zakończeniu Actions zaktualizuj aplikację i integrację HACS. Uruchom ponownie HA i otwórz PV Lab ponownie.

## Poprawki

- Profil wstępny od 10 jasnych dni przy zachowaniu minimalnej liczby niezależnych lat (domyślnie 2). Wpływ rośnie stopniowo z liczbą dni; 30 dni to domyślny cel dojrzałości, zamiast wcześniejszego przełącznika 0%/aktywne. Mniej niż 10 dni albo niewystarczająca liczba lat nadal blokuje korektę. Nie obniżamy progów kompletności ani kryteriów jasnego dnia, nie poszerzamy okna sezonowego.
- Statusy: profil wstępny, profil dojrzały, brak wystarczających danych, mała energia oraz „Noc — korekta nie dotyczy”. W nocy i przy zbyt małej energii nie pokazujemy mylącego 0% pewności.
- Rzeczywista produkcja wybranego dnia jest odczytywana bezpośrednio z godzinowego archiwum, niezależnie od wykluczeń uczenia. Poprawna energia z godziny wykluczonej z uczenia pozostaje widoczna, z gwiazdką; nadal nie trafia do rekordów i kalibracji. Nie zastępujemy braków zerami i nie odtwarzamy odrzuconych błędnych przyrostów.
- Historyczny potencjał ma ten sam układ ikony i wielkość tekstu co reszta bocznego menu, także na telefonie.
- Dokumentacja dodatku: neutralny tytuł „PV Lab — pierwsze kroki” i uaktualniona treść dla profili historycznych, urządzeń, planowania i integracji. Poprzedni tytuł „PV Lab 0.2” był pozostawionym starym nagłówkiem.

Dotychczasowe ustawienia, archiwum i kalibracja pozostają zachowane. Nie trzeba ponownie importować całej historii dla tych poprawek: archiwum 0.5.0 zachowało energię godzin wykluczonych z uczenia. Jeśli konkretnej godziny nie ma w archiwum, wykonaj ponowny import odpowiedniego zakresu.

Przykład: 26 jasnych dni z 4 lat w profilu całości daje już profil wstępny, z konserwatywnym wskaźnikiem około 30%. To nie oznacza obniżenia prognozy o 30% — wskaźnik jedynie ogranicza wpływ łagodnej korekty, stosowanej dopiero powyżej odniesienia z marginesem.

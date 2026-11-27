# PV Lab 0.10.5 — podejrzenie śniegu

Paczka zawiera tylko zmienione pliki względem dostarczonego 0.10.4, z zachowaniem katalogów. Bez usuwania danych, konfiguracji i zatwierdzonych planów.

1. Rozpakuj i wgraj zawartość do głównego katalogu repozytorium z zachowaniem podkatalogów.
2. Poczekaj na zielone Actions → Publish PV Lab version.
3. Zaktualizuj aplikację oraz integrację HACS do 0.10.5. Uruchom ponownie HA i odśwież kartę.
4. W Prognozy i korekty znajdziesz „Automatyczne wykrywanie zasłonięcia paneli”. Domyślnie włączone; potrzebuje około godziny nowych poprawnych pomiarów. Opcjonalnie wskaż lokalną encję weather.

W tej sekcji można trwale wyłączyć korektę. Widoczny komunikat oznacza podejrzenie, nie pewne rozpoznanie śniegu. Limit dotyczy tylko pozostałej części dzisiejszego dnia. Auto i Energia korzystają ze skorygowanego wyniku; istniejące zasady przeplanowania pozostają w mocy. Ręczne ograniczenie dostępności działa niezależnie. Nie trzeba ponownie importować historii ani zmieniać YAML karty.

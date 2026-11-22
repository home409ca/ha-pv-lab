# Aktualizacja PV Lab 0.8.14

Pakiet `pv-lab-update-0.8.14.zip` zawiera wyłącznie pliki zmienione względem 0.8.13, z zachowaniem podkatalogów. Rozpakuj i wgraj zawartość do głównego katalogu repozytorium. Niczego nie usuwaj. Nie wgrywaj samego ZIP jako pliku kodu.

1. Zaktualizuj aplikację PV Lab oraz integrację HACS do 0.8.14; uruchom ponownie HA i odśwież dashboard. Nie odinstalowuj dodatku.
2. Dotychczasowa karta przejdzie na domyślny widok kompaktowy. `layout: full` przywraca większy układ. `title` zmienia nazwę, `show_header: false` albo `title: ""` ukrywa tytuł. Dodatkowo `max_plans: 1–3`, `show_energy_bar` i `show_details`.
3. W nowej zakładce Analiza AI możesz opcjonalnie zapisać własny klucz Gemini. Domyślnie moduł jest wyłączony; podgląd danych działa lokalnie. Analiza wymaga osobnego ręcznego wysłania danych i nie zmienia żadnego obliczenia PV ani planu.

Historia, ceny, profile i ustawienia planowania pozostają zachowane. Nie trzeba ponownie importować danych. Pełne opisy w DOCS.md i DASHBOARD-CARD.md.

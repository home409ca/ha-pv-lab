# PV Lab 0.8.11

Tylko zmienione pliki od 0.8.10, z zachowaniem struktury. Wgraj zawartość paczki do głównego katalogu repozytorium, zaktualizuj aplikację oraz integrację HACS, uruchom ponownie HA i odśwież dashboard.

Karta korzysta z pierwszych trzech pozycji wspólnej listy planów PV Lab. Aplikacja pokazuje też dalsze alternatywy. Dla zgodnego porównania wybierz te same cykle, dni, profile i ograniczenia oraz odśwież wcześniej otwartą aplikację po przeliczeniu karty. Karta nie nadpisuje zapisanych ustawień aplikacji. Usunięto odmienny ranking i dodatkowy bufor startu tylko na karcie.

Kliknięcia urządzeń wybierają 0 → 1 → 2 → 3 → 0. Przy zerze nie ma cyfry, przy wyborze urządzenie jest zielone i ma małą liczbę bez plakietki. Nie ma Wyzeruj ani ramki Stan: propozycje. Przycisk Zatwierdź jest przy nazwie planu, nazwa cyklu i godziny są obok siebie, a ? rozwija szczegóły. Pasek PV/bilans i zakupu energii pozostaje.

Historia, taryfa, profile, ustawienia oraz reguła dopłaty do 5 gr pozostają zachowane. Nie trzeba ponawiać importu. Zatwierdzenie nadal nie steruje gniazdkami. Jeśli ręcznie dodałeś zasób karty, możesz zmienić jego adres na /pv_lab_frontend/pv-lab-plan-card.js?v=0.8.11-dashboard.

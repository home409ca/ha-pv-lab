# PV Lab 0.8.10

Tylko zmienione pliki od 0.8.9, z zachowaniem podkatalogów. Wgraj zawartość do głównego katalogu repozytorium, zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież stronę/dashboard. Niczego nie usuwaj i nie importuj ponownie historii.

Wybór cykli przyciskami 0–3. Główna lista proponowanych harmonogramów jest uporządkowana według szacowanego kosztu planu; w grupie do 5 gr droższej od najtańszego planu preferowany jest zapas PV i niższy koszt przy gorszej pogodzie. Scenariusze pozostają jako Koszt przy innej pogodzie, z objaśnieniem. PV jako osobne porównanie znajduje się w szczegółach zaawansowanych. Rozwinięcie do dziesięciu jest w obu widokach.

Karta HA: kliknięcia urządzeń dodają cykle, Wyzeruj usuwa wybór, dni Dziś i Jutro można zaznaczyć razem. Nie ma wyboru celu; rekomendacja korzysta z kosztu, PV i bilansowania. Krótkie propozycje pokazują cenę i godziny cykli. Zatwierdzenie nadal nie steruje gniazdkami.

Profil, wariant programu, daty, bilansowanie, ceny, biblioteka i historia są zachowane. Dawny zapis ponad trzy cykle w pełnej aplikacji pozostaje widoczny jako dodatkowy przycisk. Ustawienie wagi ostrożności pozostaje zachowane dla dawnego API; główny ranking kosztowy nie używa ukrytej dopłaty ryzyka ponad wyświetlaną kwotę. Scenariusze pogodowe pozostają obliczane.

Na karcie pod ceną znajduje się cienki pasek udziałów energii: zielony PV i bilans, pomarańczowy Do dokupienia. Procent zakupu = dodatkowa energia do dokupienia po bilansowaniu / suma energii cykli, ograniczony do 0–100%; zielony jest dopełnieniem. To udział po rozliczeniu okresów, a nie fizyczny pobór w każdej minucie. Baza domu i trwające cykle są już uwzględnione przed nowymi cyklami. Przy brakującej energii lub niepoprawnym wyniku pasek jest pomijany, nie pokazuje fikcyjnego 100% PV. Gdy miniona część bieżącego okresu miała saldo importu, dodatkowy zakup może być większy niż energia cykli; udział jest wtedy ograniczony do 100%, a wyliczony koszt nie jest obcinany. Procenty zaokrąglamy do pełnych liczb.

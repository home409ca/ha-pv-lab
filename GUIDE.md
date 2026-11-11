# Przewodnik PV Lab 0.3.0

[Aktualizacja i pełne zasady działania](UPDATE-0.3.0.md).

## Gdzie czego szukać

| Zakładka | Zawartość |
|---|---|
| Przegląd | Produkcja, prognozy, stan i blokady kalibracji |
| Prognozy | Wykres dostawców/PV Lab, tabela godzinowa, okna 1/2/3 h, zmiany prognozy |
| Prognoza a produkcja | Zamrożone prognozy, rzeczywista energia, błędy, ranking i historia |
| Planowanie urządzenia | Zapotrzebowanie, rezerwa domu, tryb bilansowania, daty i rekomendacja |
| Napięcia i przestoje | Bufor, odczyt doby z HA bez zapisu i oznaczenia jakości |
| Historia i trendy | Statystyki produkcji HA; nie rekonstruują dawnych prognoz |
| Pliki i retencja | Podgląd JSON/JSONL, eksport i ustawienia retencji roboczej |
| Integracja HA | Adres, klucz parowania oraz kontrola połączenia z Energią |
| Ustawienia | Instalacja, jakość, źródła, bilans domu i godzina zamrażania prognoz |

## Encje w HA

W urządzeniu PV Lab znajdziesz prognozy na dziś/jutro/dalsze dni, pozostałą energię, okna 1/2/3 h, statusy okien, rewizje, wynik planowania i saldo. Dalsze okna dni 2–7 są domyślnie wyłączone w rejestrze. Integracja definiuje 101 sensorów (47 domyślnie aktywnych), trzy encje liczbowe, jeden wybór trybu i dwie daty wejściowe. Identyfikatory istniejących sensorów nie są zmieniane.

Wartości planu możesz edytować w WWW lub przez encje HA. Obie drogi zapisują ten sam plan w aplikacji. Puste daty oznaczają zakres dynamiczny od teraz do końca jutra; aby przywrócić ten zakres po ustawieniu konkretnych dat, użyj przycisku w WWW. Dla powtórzonej lokalnej godziny podczas jesiennej zmiany czasu formularz WWW wybiera pierwsze wystąpienie; nieistniejąca godzina wiosenna jest odrzucana.

## Panel Energia

W konfiguracji paneli słonecznych zachowaj rzeczywisty licznik AC jako produkcję i wybierz PV Lab jako źródło prognozy. Nie wybieraj sensora prognozy jako zmierzonego licznika. Nie dodawaj kilku prognoz tej samej instalacji jako niezależnych instalacji. Platforma `energy.py` i typ integracji `service` są zachowane.

## Kalibracja a raporty

Kalibracja wymaga wcześniejszej prognozy i poprawnego pełnego kwadransa, odpowiedniego statusu i napięcia. Wyłączenia sieci nie uczą zacienienia. Raporty oceniają natomiast rzeczywisty wynik godzinowy, z oznaczeniem warunków i braków. Istniejąca kalibracja nie jest zerowana przez tę aktualizację.

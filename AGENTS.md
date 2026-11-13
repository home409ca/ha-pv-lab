# PV Lab — zasady aktualizacji

Przy każdym wydaniu przeczytaj pv_lab/DOCS.md i popraw opis każdego zmienionego ekranu, algorytmu, parametru, wpływu na wynik oraz retencji. Sama zmiana numeru instrukcji nie wystarcza. Nie opisuj planowanych funkcji jako gotowych. Nie umieszczaj prywatnych kopii danych w dokumentacji.

Po zakończeniu zmian ustaw numer instrukcji zgodny z aplikacją i integracją. Uruchom python scripts/build_manual.py --refresh, przejrzyj wygenerowaną instrukcję i uruchom scripts/release.py --dry-run. Kontrola porównuje wersję, wszystkie zakładki oraz odciski źródeł; zmiana kodu po generowaniu wymaga ponownego przeglądu instrukcji.

Aktualizację dla użytkownika pakuj tylko ze zmienionych plików względem poprzedniej dostarczonej wersji, z zachowaniem struktury, maksymalnie 100 plików. Nie wymagaj usuwania plików.

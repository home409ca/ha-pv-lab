# PV Lab 0.2 — pierwsze kroki

1. Uruchom aplikację i włącz **Pokaż w panelu bocznym**.
2. Otwórz **Ustawienia**, sprawdź parametry instalacji i współrzędne pobrane z HA.
3. W **Źródłach danych** sprawdź diagnostykę Forecast.Solar, Open-Meteo i Solcast. Potwierdź w konfiguracji integracji, że Open-Meteo obejmuje obie połacie. W **Prognozach** zobaczysz wartości źródłowe, korekty i okna 2/3 h.
4. Poczekaj na pełne przedziały pomiarów i wcześniejsze prognozy. Bez nich aplikacja nie może ocenić dokładności dostawców.

Limit falownika ustawiono na **5500 W**. Próg napięcia **253 V** służy analizie i odrzucaniu próbek, a nie sterowaniu urządzeniem. Zmienisz go w ustawieniach.

Tryb demonstracyjny korzysta ze sztucznych danych. Aby oglądać swoją instalację, wybierz **Wróć do danych rzeczywistych**.

Zmiana wejść modelu rozpoczyna kalibrację od nowa; sama retencja i kanały statystyk jej nie zerują. Surowe napięcia domyślnie nie są zapisywane na dysku; zostają flagi jakości. W **Pliki i retencja** obejrzysz dane i ustawisz okresy przechowywania. W **Historia i trendy** odczytasz statystyki przyrostów energii z HA, po potwierdzeniu liczników.

Encje i przebieg dla Energii dostarcza osobna integracja z katalogu `custom_components/pv_lab`. Skopiuj ją do `/config/custom_components/pv_lab`, zrestartuj HA i dodaj integrację PV Lab przez formularz. Adres aplikacji i klucz parowania znajdziesz w sekcji **Integracja HA**. Szczegółowy przewodnik jest w `GUIDE.md` repozytorium.

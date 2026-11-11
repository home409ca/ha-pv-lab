# Integracja PV Lab 0.3.0 przez HACS

Pełne repozytorium zawiera obok siebie aplikację Supervisor i integrację. HACS instaluje tylko `custom_components/pv_lab`. Sklep aplikacji HA instaluje tylko `pv_lab`.

1. Wgraj zawartość pełnej paczki do repozytorium. `hacs.json` musi być w głównym katalogu obok `repository.yaml`.
2. W HACS dodaj repozytorium jako Integration, odśwież informacje i pobierz najnowszą gałąź albo wydanie zawierające manifest 0.3.0. Nie wybieraj starego commita.
3. Najpierw zaktualizuj aplikację, następnie integrację; uruchom ponownie cały Home Assistant.
4. Istniejącej integracji nie trzeba usuwać ani ponownie parować. Przy pierwszej instalacji dodaj PV Lab w Urządzenia i usługi, używając adresu i klucza z panelu aplikacji.

Osobna paczka `pv-lab-hacs-0.3.0.zip` zawiera wyłącznie część integracji i manifest HACS. Do zwykłej aktualizacji całego repozytorium wystarczy pełna paczka. Instalacja ręczna: kompletny katalog `custom_components/pv_lab` skopiuj do `/config/custom_components/pv_lab`, bez dodatkowego katalogu nadrzędnego.

Wersja zachowuje `integration_type: service`, dzięki czemu wpis może pojawiać się w wyborze prognozy Energii. Dokumentacja interfejsów encji: [Number](https://developers.home-assistant.io/docs/core/entity/number/), [Select](https://developers.home-assistant.io/docs/core/entity/select/), [DateTime](https://developers.home-assistant.io/docs/core/entity/datetime/).

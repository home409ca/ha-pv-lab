# PV Lab 0.9.3

Paczka zawiera tylko zmienione pliki względem 0.9.2. Wgraj je z zachowaniem katalogów, zaktualizuj aplikację i integrację HACS, uruchom ponownie HA i odśwież dashboard. Nie usuwaj danych ani nie odinstalowuj PV Lab.

W YAML karty ustaw `show_plan_chart: true`. Dla nazwy programu przy urządzeniu i schowanego wyboru użyj `show_program_in_device: true`, `program_variants_position: details`, `program_variants_style: select`. Pełny przykład znajduje się w CARD-EXAMPLE.yaml.

W PV Lab → Profile urządzeń wybierz profil i wariant, potem „Ustaw ten wariant jako domyślny”. Opcjonalnie wybierz „Ustaw jako podstawowy dla urządzenia”. „60 min” może być osobną nazwą programu pralki i zmywarki.

Cykle pozostają zapisane po ponownym odczycie i wygaśnięciu Recordera. Starsze profile zostaną poprawione, jeśli zachowały się wszystkie ich źródła. W pozostałych przypadkach wybierz dostępne cykle i zaktualizuj profil; niczego nie kasujemy automatycznie. Zatwierdzone wcześniej plany nie zmieniają swojego programu.

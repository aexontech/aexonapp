; ── Aexon Custom Uninstaller ──────────────────────────────────────────────────
; Menampilkan dialog konfirmasi hapus data saat uninstall

!macro customUnInstall
  ; Baca storage path dari Registry
  ReadRegStr $0 HKCU "Software\Aexon" "StoragePath"

  ${If} $0 != ""
    MessageBox MB_YESNO|MB_ICONEXCLAMATION \
      "Apakah Anda ingin menghapus SEMUA data sesi dan rekaman?$\r$\n$\r$\nPeringatan: Seluruh data session, foto, video, dan laporan yang pernah direkam akan hilang secara permanen dan tidak dapat dikembalikan.$\r$\n$\r$\nLokasi data: $0" \
      IDYES deleteData IDNO skipDelete

    deleteData:
      RMDir /r "$0"
      ; Hapus registry key
      DeleteRegKey HKCU "Software\Aexon"
      Goto done

    skipDelete:
      ; Hapus registry key saja, data tetap di disk
      DeleteRegKey HKCU "Software\Aexon"

    done:
  ${Else}
    ; Tidak ada data path di registry — hapus key saja
    DeleteRegKey HKCU "Software\Aexon"
  ${EndIf}
!macroend

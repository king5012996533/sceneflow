Get-CimInstance Win32_Process -Filter "ProcessId=39784 or ProcessId=18708" | Select-Object ProcessId, Name, CommandLine | Format-List

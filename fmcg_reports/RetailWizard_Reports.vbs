' RetailWizard Reports – Silent Launcher
' Double-click this file to start the app silently
' A system tray notification will appear when ready

Option Explicit

Dim WshShell, FSO, AppPath, LogPath, PythonCmd
Dim objHTTP, strURL, bRunning, iWait

Set WshShell = CreateObject("WScript.Shell")
Set FSO      = CreateObject("Scripting.FileSystemObject")

' ── Get script directory ───────────────────────────────────────
AppPath = FSO.GetParentFolderName(WScript.ScriptFullName)

' ── Create logs folder ────────────────────────────────────────
If Not FSO.FolderExists(AppPath & "\logs") Then
    FSO.CreateFolder(AppPath & "\logs")
End If
LogPath = AppPath & "\logs\launcher.log"

' ── Find Python ───────────────────────────────────────────────
PythonCmd = ""
Dim aPaths(8)
aPaths(0) = "python"
aPaths(1) = "python3"
aPaths(2) = "C:\Python312\python.exe"
aPaths(3) = "C:\Python311\python.exe"
aPaths(4) = "C:\Python310\python.exe"
aPaths(5) = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\Python\Python312\python.exe")
aPaths(6) = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\Python\Python311\python.exe")
aPaths(7) = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\Python\Python310\python.exe")
aPaths(8) = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\Python\Python39\python.exe")

Dim i
For i = 0 To 8
    On Error Resume Next
    Dim ret
    ret = WshShell.Run("cmd /c " & aPaths(i) & " --version >nul 2>&1", 0, True)
    If ret = 0 Then
        PythonCmd = aPaths(i)
        Exit For
    End If
    On Error GoTo 0
Next

If PythonCmd = "" Then
    MsgBox "Python not found!" & vbCrLf & vbCrLf & _
           "Please install Python 3.10+ from:" & vbCrLf & _
           "https://python.org/downloads" & vbCrLf & vbCrLf & _
           "During installation, check 'Add Python to PATH'", _
           vbCritical, "RetailWizard – Python Required"
    WScript.Quit 1
End If

' ── Kill old instance on port 5000 ────────────────────────────
WshShell.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano 2^>nul ^| findstr "":5000 ""') do taskkill /F /PID %a >nul 2>&1", 0, True

' ── Install dependencies (silent) ─────────────────────────────
Dim checkCmd
checkCmd = "cmd /c " & PythonCmd & " -c ""import flask, pyodbc, pandas, openpyxl, reportlab"" >nul 2>&1"
If WshShell.Run(checkCmd, 0, True) <> 0 Then
    ' Show progress notification
    WshShell.Popup "Installing required packages... Please wait (1-3 minutes).", 3, "RetailWizard Setup", 64
    Dim installCmd
    installCmd = "cmd /c " & PythonCmd & " -m pip install flask pyodbc pandas openpyxl reportlab --quiet >> """ & LogPath & """ 2>&1"
    WshShell.Run installCmd, 0, True
End If

' ── Start Flask app ───────────────────────────────────────────
Dim startCmd
startCmd = "cmd /c cd /d """ & AppPath & """ && " & PythonCmd & " app.py >> """ & LogPath & """ 2>&1"
WshShell.Run startCmd, 0, False

' ── Wait for server ──────────────────────────────────────────
strURL  = "http://localhost:5000/health"
bRunning = False
iWait   = 0

Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")

Do While iWait < 20 And Not bRunning
    WScript.Sleep 1000
    iWait = iWait + 1
    On Error Resume Next
    objHTTP.Open "GET", strURL, False
    objHTTP.setTimeouts 1000, 1000, 2000, 2000
    objHTTP.Send
    If objHTTP.Status = 200 Then bRunning = True
    On Error GoTo 0
Loop

' ── Open browser ─────────────────────────────────────────────
WshShell.Run "http://localhost:5000", 1, False

If Not bRunning Then
    WshShell.Popup "Reports server is starting..." & vbCrLf & _
                   "Opening: http://localhost:5000" & vbCrLf & vbCrLf & _
                   "If page doesn't load, wait 10 seconds and refresh.", _
                   5, "RetailWizard Reports", 64
End If

Set WshShell = Nothing
Set FSO      = Nothing
Set objHTTP  = Nothing

param(
  [Int32] $wrapPort,
  [string] $jlpath,
  [string[]] $jlargs
)

# start Julia
$proc = Start-Process "`"$jlpath`"" $jlargs -NoNewWindow -PassThru

# import GenerateConsoleCtrlEvent:
$MethodDefinition = @'
[DllImport("Kernel32.dll", CharSet = CharSet.Unicode)]
public static extern bool GenerateConsoleCtrlEvent(uint dwCtrlEvent, uint dwProcessGroupId);
[DllImport("Kernel32.dll", CharSet = CharSet.Unicode)]
public static extern bool SetConsoleCtrlHandler(EventHandler handler, bool add);
'@

$Kernel32 = Add-Type -MemberDefinition $MethodDefinition -Name 'Kernel32' -Namespace 'Win32' -PassThru

# keep us alive!
$status = $Kernel32::SetConsoleCtrlHandler($null, $true)

function Receive-TCPMessage {
    param ( [ValidateNotNullOrEmpty()]
        [int] $Port
    )
    try {
        $endpoint = new-object System.Net.IPEndPoint([ipaddress]::Loopback, $port)
        $listener = new-object System.Net.Sockets.TcpListener $endpoint
        $listener.start()

        $data = $listener.AcceptTcpClient() # will block here until connection
        $bytes = New-Object System.Byte[] 6
        $stream = $data.GetStream()

        while (($i = $stream.Read($bytes,0,$bytes.Length)) -ne 0){
            $EncodedText = New-Object System.Text.ASCIIEncoding
            $data = $EncodedText.GetString($bytes,0, $i)
            Write-Output $data
        }

        $stream.close()
        $listener.stop()
    }
  catch [exception]{
        echo "julia-client: Internal Error:"
        echo "$exception"
    }
}

while ($true){
  $msg = Receive-TCPMessage -Port $wrapPort # wait for interrupts
  if ($msg -match "SIGINT"){
    $status = $Kernel32::GenerateConsoleCtrlEvent(0, $proc.Id)
    # this is necessary for GenerateConsoleCtrlEvent to actually do something:
    Write-Host "" -NoNewLine
    if (!$status) {
      echo "julia-client: Internal Error: Interrupting Julia failed."
    }
  }
  if ($msg -match "KILL"){
    if (!($proc.HasExited)){
      $proc.Kill()
    }
    Exit
  }
}

param([Int32] $port, [string] $jlpath = "julia") # additionally: [string] $jlargs
# powershell -ExecutionPolicy bypass "& "D:\Dokumente\Git\atom-julia-client\lib\connection\start_julia_and_listen_to_interrupts.ps1" -port 1234"

echo "Starting Julia..."
$proc = Start-Process julia "-e `"import Atom; ccall(:jl_exit_on_sigint, Void, (Cint,), false); @sync Atom.connect($port)`"" -NoNewWindow -PassThru # start the julia client
echo "Julia (pid $($proc.Id)) listens on port $port"

$MethodDefinition = @'
[DllImport("Kernel32.dll", CharSet = CharSet.Unicode)]
public static extern bool GenerateConsoleCtrlEvent(uint dwCtrlEvent, uint dwProcessGroupId);
'@

$Kernel32 = Add-Type -MemberDefinition $MethodDefinition -Name 'Kernel32' -Namespace 'Win32' -PassThru

function Receive-TCPMessage { 
    param ( [ValidateNotNullOrEmpty()] 
        [int] $Port
    ) 
    try { 
        $endpoint = new-object System.Net.IPEndPoint([ipaddress]::any,$port) 
        $listener = new-object System.Net.Sockets.TcpListener $EndPoint
        $listener.start() 
 
        $data = $listener.AcceptTcpClient() # will block here until connection 
        $bytes = New-Object System.Byte[] 1024
        $stream = $data.GetStream() 
 
        while (($i = $stream.Read($bytes,0,$bytes.Length)) -ne 0){
            $EncodedText = New-Object System.Text.ASCIIEncoding
            $data = $EncodedText.GetString($bytes,0, $i)
            Write-Output $data
        }
         
        $stream.close()
        $listener.stop()
    }
	catch [exception]{}
}

echo "listening to SIGINTs on port 26992"
while ($true){
	$msg = Receive-TCPMessage -Port 26992 # wait for interrupts
	if ($msg -match "SIGINT"){
		echo "SIGINT received."
		$err = $Kernel32::GenerateConsoleCtrlEvent(0, $proc.Id)
		if ($err){
			echo "Successfully sent GenerateConsoleCtrlEvent."
		}
	}
}

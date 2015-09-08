function Send-TCPMessage { 
    param ( [ValidateNotNullOrEmpty()] 
        [string] $EndPoint, 
        [int] $Port, 
        $Message
    ) 
     
    $UTF8 = [System.Text.Encoding]::UTF8
    $IP = [System.Net.Dns]::GetHostAddresses($EndPoint) 
    $Address = [System.Net.IPAddress]::Parse($IP) 
    $Socket = New-Object System.Net.Sockets.TCPClient($Address,$Port) 
    $data = $UTF8.GetBytes($Message)
    $Stream = $Socket.GetStream() 
    $Writer = New-Object System.IO.StreamWriter($Stream)
    $Message | %{
        $Writer.WriteLine($_)
        $Writer.Flush()
    }
    $Stream.Close()
    $Socket.Close()
}

Send-TCPMessage -Port 26992 -Endpoint 127.0.0.1 -message "SIGINT"
echo "Sent SIGINT to powershell wrapper, port 26992"
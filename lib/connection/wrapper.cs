using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Net.Sockets;
using System.Net;

namespace TestTrapCtrlC
{
    public class Program
    {
        #region Trap application termination
        [DllImport("Kernel32")]
        private static extern bool SetConsoleCtrlHandler(EventHandler handler, bool add);

        [DllImport("Kernel32")]
        private static extern bool GenerateConsoleCtrlEvent(uint dwCtrlEvent, uint dwProcessGroupId);

        private delegate bool EventHandler(CtrlType sig);

        enum CtrlType
        {
            CTRL_C_EVENT = 0,
            CTRL_BREAK_EVENT = 1,
            CTRL_CLOSE_EVENT = 2,
            CTRL_LOGOFF_EVENT = 5,
            CTRL_SHUTDOWN_EVENT = 6
        }

        private static bool Handler(CtrlType sig)
        {
            Console.WriteLine(sig);
            if (sig == CtrlType.CTRL_BREAK_EVENT)
            {
                return false;
            }
            return true;
        }
        #endregion

        static void Main(string[] args)
        {
            // Handle input
            string jlpath = args[0];
            string boot = args[1];
            int port = Int32.Parse(args[2]);

            Console.WriteLine($"jlpath: {jlpath}");
            Console.WriteLine($"boot: {boot}");
            Console.WriteLine($"port: {port}");

            // Spawn Julia
            ProcessStartInfo startInfo = new ProcessStartInfo(jlpath);
            //startInfo.CreateNoWindow = true;
            startInfo.Arguments = $"{boot} \"{port}\"";
            startInfo.RedirectStandardError = true;
            startInfo.RedirectStandardInput = true;
            startInfo.RedirectStandardOutput = true;
            startInfo.UseShellExecute = false;

            SetConsoleCtrlHandler(null, false);

            Process proc = Process.Start(startInfo);
            proc.OutputDataReceived += (sender, arg) => Console.WriteLine(arg.Data);
            proc.BeginOutputReadLine();
            proc.ErrorDataReceived += (sender, arg) => Console.WriteLine(arg.Data);
            proc.BeginErrorReadLine();
            
            // Wait for calls from Atom:
            IPAddress ipAddress = IPAddress.Parse("0.0.0.0");

            TcpListener listener = new TcpListener(ipAddress, 26992);
            listener.Start();

            // Set the ctrl-c event handler
            SetConsoleCtrlHandler(new EventHandler(Handler), true);

            while (true)
            {
                Console.WriteLine("Listening...");
                Socket client = listener.AcceptSocket();

                byte[] data = new byte[100];
                int size = client.Receive(data);
                client.Close();
                string str = Encoding.ASCII.GetString(data);

                if (str.Contains("SIGINT"))
                {
                    Console.WriteLine("SIGINT received...");
                    Console.WriteLine($"Will be sent to {proc.Id}.");
                    bool status = GenerateConsoleCtrlEvent(0, (uint)proc.Id);
                    Console.WriteLine($"Status: {status}");
                }
                else if (str.Contains("KILL"))
                {
                    proc.Kill();
                    listener.Stop();
                    return;
                }
            }
        }
    }
}
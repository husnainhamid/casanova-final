const socket = io("https://signaling-server-production.up.railway.app");
let localStream;
let remoteStream;
let pc;

async function joinRoom() {
  const roomId = document.getElementById("roomId").value;
  if (!roomId) return alert("Enter a room ID");

  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  document.getElementById("localVideo").srcObject = localStream;

  pc = new RTCPeerConnection();

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  pc.ontrack = (event) => {
    [remoteStream] = event.streams;
    document.getElementById("remoteVideo").srcObject = remoteStream;
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", { roomId, candidate: event.candidate });
    }
  };

  socket.emit("join", roomId);

  socket.on("offer", async (offer) => {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { roomId, answer });
  });

  socket.on("answer", async (answer) => {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("candidate", async ({ candidate }) => {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error(e);
    }
  });

  socket.on("ready", async () => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", { roomId, offer });
  });
}

// WebUSB API type declarations
interface USB {
  requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
  getDevices(): Promise<USBDevice[]>;
}

interface USBDeviceRequestOptions {
  filters: USBDeviceFilter[];
}

interface USBDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

interface USBDevice {
  readonly productName?: string;
  readonly manufacturerName?: string;
  readonly serialNumber?: string;
  readonly configuration?: USBConfiguration;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  releaseInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
}

interface USBConfiguration {
  readonly interfaces: USBInterface[];
}

interface USBInterface {
  readonly alternates: USBAlternateInterface[];
}

interface USBAlternateInterface {
  readonly endpoints: USBEndpoint[];
}

interface USBEndpoint {
  readonly direction: "in" | "out";
  readonly endpointNumber: number;
}

interface USBOutTransferResult {
  readonly bytesWritten: number;
  readonly status: USBTransferStatus;
}

type USBTransferStatus = "ok" | "stall" | "babble";

interface Navigator {
  readonly usb?: USB;
}

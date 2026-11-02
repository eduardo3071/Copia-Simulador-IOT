import type { DetailedHTMLProps, HTMLAttributes } from "react";

type WokwiProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "wokwi-arduino-uno": WokwiProps;
      "wokwi-led": WokwiProps;
      "wokwi-resistor": WokwiProps;
      "wokwi-pushbutton": WokwiProps;
      "wokwi-potentiometer": WokwiProps;
      "wokwi-rgb-led": WokwiProps;
      "wokwi-buzzer": WokwiProps;
      "wokwi-7segment": WokwiProps;
      "wokwi-led-bar-graph": WokwiProps;
      "wokwi-servo": WokwiProps;
      "wokwi-lcd1602": WokwiProps;
      "wokwi-dht22": WokwiProps;
      "wokwi-hc-sr04": WokwiProps;
      "wokwi-photoresistor-sensor": WokwiProps;
      "wokwi-slide-potentiometer": WokwiProps;
    }
  }
}
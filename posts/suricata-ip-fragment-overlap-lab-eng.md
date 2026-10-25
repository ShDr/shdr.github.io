# Suricata IP Fragment Overlap Detection Lab

**Hands-on Network Security \| Suricata IDS \| IP Fragmentation \|
Splunk SIEM**

## Overview

This lab demonstrates how to generate controlled IP-fragment overlap
traffic in an isolated Ubuntu test environment, inspect Suricata's
detection, and review the resulting security event in Splunk.

The objective was to investigate whether Suricata could alert on
overlapping IP fragments, and to understand the distinction between
detecting a fragmentation anomaly and detecting a malicious payload.

> **Scope:** Authorized lab traffic only. This document records the
> workflow and observed outcome from the lab discussion. Exact rule
> syntax, generator commands, and screenshots should be added from the
> original environment where available; they are intentionally not
> guessed here.

## Lab Goals

-   Create a controlled packet scenario involving overlapping IP
    fragments.
-   Modify payload bytes in an overlapping fragment to make the overlap
    meaningful for analysis.
-   Confirm whether Suricata generates an alert for the test traffic.
-   Review the event flow into Splunk.
-   Understand what the alert proves---and what it does not
    prove---about packet reassembly and IDS visibility.

## Environment

  -----------------------------------------------------------------------
  Component                           Role
  ----------------------------------- -----------------------------------
  Ubuntu                              Lab host used to generate/test
                                      traffic and run the relevant lab
                                      components

  Suricata                            Network IDS used to inspect traffic
                                      and generate alerts

  Splunk                              Central event search and
                                      investigation interface


  -----------------------------------------------------------------------

**Troubleshooting note:**  the initial investigation had
focused too heavily on packet capture and reassembly possibilities.

## Method

### 1. Prepare the test traffic

A packet was duplicated to create an overlapping-fragment scenario. The
payload in one of the overlapping portions was modified so that two
fragments claimed some of the same IP-payload byte positions but carried
different data in the overlap.

Conceptually, the scenario was:

-   One fragment covered a range of IP payload bytes.
-   A second fragment overlapped part of that range.
-   The bytes in the overlapping region were not identical.

This creates a fragmentation ambiguity that can be relevant when
different systems handle overlapping fragments differently.

### 2. Run the detection test

The traffic was sent through the lab setup while Suricata was running
and monitoring the relevant traffic path. The rule configuration was
intended to detect the overlapping-fragment condition.

**Important distinction:** A rule that matches payload content is not
necessarily inspecting the entire packet sequence or proving that two
fragments overlapped. The conclusion depends on the actual rule keywords
and event that fired. Preserve the exact rule and alert record as
evidence when publishing this lab.


### 4. Verify the alert and Splunk ingestion

After the test worked, Suricata generated an alert, and the workflow was
confirmed to be working with Splunk as well.

For a portfolio evidence set, attach: - The relevant Suricata alert
record (for example, the matching event from `eve.json`). - The
corresponding Splunk event or search result. - The exact rule used in
the lab. - A short capture or packet-analysis view showing the fragment
offsets and overlap, with sensitive host details redacted.

Do not include fabricated screenshots or event fields. Capture these
directly from the lab.

## Observed Result

**Result:** The overlapping-fragment test generated a Suricata alert
after the port issue was resolved, and the lab workflow was operating
with Splunk.

The key troubleshooting finding was that the immediate blocker was the
port configuration---not necessarily Suricata's fragmentation engine,
NIC offloading, or packet reassembly.

## What the Result Demonstrates

1.  **Detection path is functioning:** Suricata produced an alert for
    the tested scenario.
2.  **SIEM workflow is functioning:** The alert was available in the
    Suricata-to-Splunk workflow.
3.  **Basic troubleshooting matters:** A port conflict can make a valid
    detection test appear broken.
4.  **The alert must be interpreted precisely:** An alert alone does not
    prove that Suricata and the destination host would reconstruct the
    exact same datagram, nor does it prove that a payload signature
    inspected every fragment independently.

## What This Test Does Not Prove

-   It does not, by itself, establish which overlapping bytes Suricata
    retains during IP defragmentation.
-   It does not prove that the destination operating system reconstructs
    the datagram in the same way as Suricata.
-   It does not prove that every overlap pattern or evasion technique
    will be detected.
-   It does not establish that the payload itself was malicious. The lab
    tests a packet-handling condition, not a real-world compromise.

To make stronger claims, compare the exact Suricata rule and alert
fields with a packet capture, and consult the documentation for the
specific Suricata version and target operating system.

## Evidence Checklist

-   [ ] Exact Suricata rule copied from the lab
-   [ ] Suricata version and relevant capture interface recorded
-   [ ] Packet capture showing fragment offsets and overlapping byte
    ranges
-   [ ] Suricata alert record captured from `eve.json`
-   [ ] Matching Splunk event/search screenshot
-   [ ] IP addresses, hostnames, tokens, and other sensitive details
    redacted

## Portfolio Summary

Built and troubleshot a controlled IP-fragment overlap detection lab
using Ubuntu, Suricata, and Splunk. Duplicated a packet, modified
payload bytes in the overlapping region, and verified that Suricata generated an
alert within the Splunk workflow. The exercise reinforced the importance
of validating the traffic path and distinguishing an anomaly alert from
proof of end-to-end reassembly behavior.

------------------------------------------------------------------------

**Suggested repository path:**
`suricata-ip-fragment-overlap-lab/README.md`

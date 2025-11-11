import { randomUUID } from 'crypto'

// ============================================================================
// FHIR Resource Types
// ============================================================================

interface FHIRResource {
  resourceType: string
  id: string
  [key: string]: any
}

interface Patient extends FHIRResource {
  resourceType: 'Patient'
  name?: Array<{ given?: string[]; family?: string }>
  birthDate?: string
  gender?: string
}

interface Condition extends FHIRResource {
  resourceType: 'Condition'
  subject: { reference: string }
  code: { coding: Array<{ system: string; code: string; display: string }> }
  onsetDateTime?: string
  abatementDateTime?: string
  encounter?: { reference: string }
}

interface Encounter extends FHIRResource {
  resourceType: 'Encounter'
  status: string
  class: { code: string }
  subject: { reference: string }
  period: { start: string; end?: string }
  reasonReference?: Array<{ reference: string }>
}

interface Procedure extends FHIRResource {
  resourceType: 'Procedure'
  status: string
  code: { coding: Array<{ system: string; code: string; display: string }> }
  subject: { reference: string }
  performedDateTime?: string
  encounter?: { reference: string }
  reasonReference?: Array<{ reference: string }>
}

interface MedicationRequest extends FHIRResource {
  resourceType: 'MedicationRequest'
  status: string
  intent: string
  medicationCodeableConcept: {
    coding: Array<{ system: string; code: string; display: string }>
  }
  subject: { reference: string }
  authoredOn?: string
  encounter?: { reference: string }
  reasonReference?: Array<{ reference: string }>
}

interface CarePlan extends FHIRResource {
  resourceType: 'CarePlan'
  status: string
  intent: string
  subject: { reference: string }
  period?: { start: string; end?: string }
  activity?: Array<{
    detail: {
      code: { coding: Array<{ system: string; code: string; display: string }> }
      status: string
    }
  }>
  addresses?: Array<{ reference: string }>
}

// ============================================================================
// Graph JSON Types
// ============================================================================

interface GraphNode {
  type: string
  name: string
  [key: string]: any
}

interface GraphJSON {
  name: string
  remarks?: string[]
  nodes: Record<string, GraphNode>
}

// ============================================================================
// Generator Context
// ============================================================================

interface GeneratorContext {
  patient: Patient
  currentDate: Date
  attributes: Record<string, any>
  resources: FHIRResource[]
  visitedNodes: Set<string>
}

// ============================================================================
// FHIR Resource Generator
// ============================================================================

class FHIRDiseaseProgressionGenerator {
  private context: GeneratorContext

  constructor(patient: Patient, startDate?: Date) {
    this.context = {
      patient,
      currentDate: startDate || new Date(),
      attributes: {},
      resources: [],
      visitedNodes: new Set(),
    }
  }

  /**
   * Process a graph JSON and generate FHIR resources
   */
  async processGraph(graph: GraphJSON): Promise<FHIRResource[]> {
    console.log(`Processing graph: ${graph.name}`)

    // Start from the Initial node
    const initialNode = graph.nodes['Initial']
    if (!initialNode) {
      throw new Error('Graph must have an Initial node')
    }

    await this.processNode('Initial', initialNode, graph)

    return this.context.resources
  }

  /**
   * Process a single node in the graph
   */
  private async processNode(
    nodeName: string,
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    // Prevent infinite loops
    if (this.context.visitedNodes.has(nodeName)) {
      return
    }
    this.context.visitedNodes.add(nodeName)

    console.log(`Processing node: ${nodeName} (${node.type})`)

    // Process based on node type
    switch (node.type) {
      case 'Initial':
        await this.handleInitial(node, graph)
        break
      case 'Delay':
        await this.handleDelay(node, graph)
        break
      case 'Simple':
        await this.handleSimple(node, graph)
        break
      case 'ConditionOnset':
        await this.handleConditionOnset(node, graph)
        break
      case 'ConditionEnd':
        await this.handleConditionEnd(node, graph)
        break
      case 'Encounter':
        await this.handleEncounter(node, graph)
        break
      case 'EncounterEnd':
        await this.handleEncounterEnd(node, graph)
        break
      case 'Procedure':
        await this.handleProcedure(node, graph)
        break
      case 'MedicationEnd':
        await this.handleMedicationEnd(node, graph)
        break
      case 'CarePlanStart':
        await this.handleCarePlanStart(node, graph)
        break
      case 'CarePlanEnd':
        await this.handleCarePlanEnd(node, graph)
        break
      case 'SetAttribute':
        await this.handleSetAttribute(node, graph)
        break
      case 'Symptom':
        await this.handleSymptom(node, graph)
        break
      case 'CallSubmodule':
        await this.handleCallSubmodule(node, graph)
        break
      case 'Terminal':
        console.log('Reached terminal node')
        return
      default:
        console.warn(`Unknown node type: ${node.type}`)
    }
  }

  // ============================================================================
  // Node Type Handlers
  // ============================================================================

  private async handleInitial(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    await this.followTransition(node, graph)
  }

  private async handleDelay(node: GraphNode, graph: GraphJSON): Promise<void> {
    // Calculate delay amount
    let delayMs = 0

    if (node.exact) {
      delayMs = this.convertToMilliseconds(node.exact.quantity, node.exact.unit)
    } else if (node.range) {
      const min = this.convertToMilliseconds(node.range.low, node.range.unit)
      const max = this.convertToMilliseconds(node.range.high, node.range.unit)
      delayMs = min + Math.random() * (max - min)
    }

    this.context.currentDate = new Date(
      this.context.currentDate.getTime() + delayMs
    )
    console.log(`Delayed to: ${this.context.currentDate.toISOString()}`)

    await this.followTransition(node, graph)
  }

  private async handleSimple(node: GraphNode, graph: GraphJSON): Promise<void> {
    await this.followTransition(node, graph)
  }

  private async handleConditionOnset(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    const condition: Condition = {
      resourceType: 'Condition',
      id: randomUUID(),
      subject: { reference: `Patient/${this.context.patient.id}` },
      code: {
        coding: node.codes.map((c: any) => ({
          system: c.system,
          code: c.code,
          display: c.display,
        })),
      },
      onsetDateTime: this.context.currentDate.toISOString(),
    }

    // Link to target encounter if specified
    if (
      node.target_encounter &&
      this.context.attributes[node.target_encounter]
    ) {
      condition.encounter = {
        reference: `Encounter/${
          this.context.attributes[node.target_encounter]
        }`,
      }
    }

    this.context.resources.push(condition)

    // Store in attribute if specified
    if (node.assign_to_attribute) {
      this.context.attributes[node.assign_to_attribute] = condition.id
    }

    console.log(`Created Condition: ${condition.code.coding[0]?.display}`)

    await this.followTransition(node, graph)
  }

  private async handleConditionEnd(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    const conditionId = this.context.attributes[node.referenced_by_attribute]
    if (conditionId) {
      const condition = this.context.resources.find(
        (r) => r.resourceType === 'Condition' && r.id === conditionId
      ) as Condition

      if (condition) {
        condition.abatementDateTime = this.context.currentDate.toISOString()
        console.log(`Ended Condition: ${condition.code.coding[0]?.display}`)
      }
    }

    await this.followTransition(node, graph)
  }

  private async handleEncounter(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    const encounter: Encounter = {
      resourceType: 'Encounter',
      id: randomUUID(),
      status: 'finished',
      class: { code: node.encounter_class || 'ambulatory' },
      subject: { reference: `Patient/${this.context.patient.id}` },
      period: { start: this.context.currentDate.toISOString() },
    }

    // Link to reason condition if specified
    if (node.reason && this.context.attributes[node.reason]) {
      encounter.reasonReference = [
        { reference: `Condition/${this.context.attributes[node.reason]}` },
      ]
    }

    this.context.resources.push(encounter)

    // Store current encounter for other resources to reference
    this.context.attributes['current_encounter'] = encounter.id

    console.log(`Created Encounter: ${encounter.class.code}`)

    await this.followTransition(node, graph)
  }

  private async handleEncounterEnd(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    const encounterId = this.context.attributes['current_encounter']
    if (encounterId) {
      const encounter = this.context.resources.find(
        (r) => r.resourceType === 'Encounter' && r.id === encounterId
      ) as Encounter

      if (encounter) {
        encounter.period.end = this.context.currentDate.toISOString()
        console.log('Ended Encounter')
      }
    }

    delete this.context.attributes['current_encounter']

    await this.followTransition(node, graph)
  }

  private async handleProcedure(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    const procedure: Procedure = {
      resourceType: 'Procedure',
      id: randomUUID(),
      status: 'completed',
      code: {
        coding: node.codes.map((c: any) => ({
          system: c.system,
          code: c.code,
          display: c.display,
        })),
      },
      subject: { reference: `Patient/${this.context.patient.id}` },
      performedDateTime: this.context.currentDate.toISOString(),
    }

    // Link to encounter if available
    if (this.context.attributes['current_encounter']) {
      procedure.encounter = {
        reference: `Encounter/${this.context.attributes['current_encounter']}`,
      }
    }

    // Link to reason condition if specified
    if (node.reason && this.context.attributes[node.reason]) {
      procedure.reasonReference = [
        { reference: `Condition/${this.context.attributes[node.reason]}` },
      ]
    }

    this.context.resources.push(procedure)
    console.log(`Created Procedure: ${procedure.code.coding[0]?.display}`)

    await this.followTransition(node, graph)
  }

  private async handleMedicationEnd(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    const medicationId = this.context.attributes[node.referenced_by_attribute]
    if (medicationId) {
      const medication = this.context.resources.find(
        (r) => r.resourceType === 'MedicationRequest' && r.id === medicationId
      ) as MedicationRequest

      if (medication) {
        medication.status = 'stopped'
        console.log('Stopped MedicationRequest')
      }
    }

    await this.followTransition(node, graph)
  }

  private async handleCarePlanStart(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    const carePlan: CarePlan = {
      resourceType: 'CarePlan',
      id: randomUUID(),
      status: 'active',
      intent: 'plan',
      subject: { reference: `Patient/${this.context.patient.id}` },
      period: { start: this.context.currentDate.toISOString() },
      activity: node.activities?.map((a: any) => ({
        detail: {
          code: {
            coding: [
              {
                system: a.system,
                code: a.code,
                display: a.display,
              },
            ],
          },
          status: 'in-progress',
        },
      })),
    }

    // Link to reason condition if specified
    if (node.reason && this.context.attributes[node.reason]) {
      carePlan.addresses = [
        { reference: `Condition/${this.context.attributes[node.reason]}` },
      ]
    }

    this.context.resources.push(carePlan)

    // Store in attribute if specified
    if (node.assign_to_attribute) {
      this.context.attributes[node.assign_to_attribute] = carePlan.id
    }

    console.log('Created CarePlan')

    await this.followTransition(node, graph)
  }

  private async handleCarePlanEnd(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    const carePlanId = this.context.attributes[node.referenced_by_attribute]
    if (carePlanId) {
      const carePlan = this.context.resources.find(
        (r) => r.resourceType === 'CarePlan' && r.id === carePlanId
      ) as CarePlan

      if (carePlan) {
        carePlan.status = 'completed'
        if (carePlan.period) {
          carePlan.period.end = this.context.currentDate.toISOString()
        }
        console.log('Ended CarePlan')
      }
    }

    await this.followTransition(node, graph)
  }

  private async handleSetAttribute(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    this.context.attributes[node.attribute] = node.value
    console.log(`Set attribute ${node.attribute} = ${node.value}`)

    await this.followTransition(node, graph)
  }

  private async handleSymptom(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    // Symptoms could be represented as Observations in FHIR
    // For now, we'll just log them and continue
    console.log(`Symptom: ${node.symptom}`)

    await this.followTransition(node, graph)
  }

  private async handleCallSubmodule(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    // Submodule calls would need to load and process another graph
    // For now, we'll simulate by creating a medication request
    console.log(`Called submodule: ${node.submodule}`)

    // Create a placeholder medication request
    const medication: MedicationRequest = {
      resourceType: 'MedicationRequest',
      id: randomUUID(),
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [
          {
            system: 'RxNorm',
            code: '000000',
            display: node.submodule.split('/').pop() || 'Medication',
          },
        ],
      },
      subject: { reference: `Patient/${this.context.patient.id}` },
      authoredOn: this.context.currentDate.toISOString(),
    }

    if (this.context.attributes['current_encounter']) {
      medication.encounter = {
        reference: `Encounter/${this.context.attributes['current_encounter']}`,
      }
    }

    this.context.resources.push(medication)

    // Store medication reference for potential later ending
    const attributeName = node.submodule.split('/').pop() || 'medication'
    this.context.attributes[attributeName] = medication.id

    await this.followTransition(node, graph)
  }

  // ============================================================================
  // Transition Handlers
  // ============================================================================

  private async followTransition(
    node: GraphNode,
    graph: GraphJSON
  ): Promise<void> {
    // Handle direct transition
    if (node.direct_transition) {
      const nextNode = graph.nodes[node.direct_transition]
      if (nextNode) {
        await this.processNode(node.direct_transition, nextNode, graph)
      }
      return
    }

    // Handle conditional transition
    if (node.conditional_transition) {
      for (const transition of node.conditional_transition) {
        if (
          !transition.condition ||
          this.evaluateCondition(transition.condition)
        ) {
          const nextNode = graph.nodes[transition.transition]
          if (nextNode) {
            await this.processNode(transition.transition, nextNode, graph)
          }
          return
        }
      }
    }

    // Handle distributed transition (probability-based)
    if (node.distributed_transition) {
      const rand = Math.random()
      let cumulative = 0

      for (const transition of node.distributed_transition) {
        cumulative += transition.distribution
        if (rand < cumulative) {
          const nextNode = graph.nodes[transition.transition]
          if (nextNode) {
            await this.processNode(transition.transition, nextNode, graph)
          }
          return
        }
      }
    }
  }

  private evaluateCondition(condition: any): boolean {
    // Simple condition evaluation
    if (condition.condition_type === 'Attribute') {
      const value = this.context.attributes[condition.attribute]

      if (condition.operator === 'is not nil') {
        return value !== undefined && value !== null
      }
      if (condition.operator === '==') {
        return value === condition.value
      }
      if (condition.operator === '!=') {
        return value !== condition.value
      }
    }

    if (condition.condition_type === 'Age') {
      // Calculate age from patient birthDate
      if (this.context.patient.birthDate) {
        const birthDate = new Date(this.context.patient.birthDate)
        const ageMs = this.context.currentDate.getTime() - birthDate.getTime()
        const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25)

        if (condition.operator === '>=') {
          return ageYears >= condition.quantity
        }
        if (condition.operator === '>') {
          return ageYears > condition.quantity
        }
        if (condition.operator === '<=') {
          return ageYears <= condition.quantity
        }
        if (condition.operator === '<') {
          return ageYears < condition.quantity
        }
      }
    }

    if (condition.condition_type === 'And') {
      return condition.conditions.every((c: any) => this.evaluateCondition(c))
    }

    if (condition.condition_type === 'Or') {
      return condition.conditions.some((c: any) => this.evaluateCondition(c))
    }

    return false
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private convertToMilliseconds(quantity: number, unit: string): number {
    const conversions: Record<string, number> = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000,
      years: 365.25 * 24 * 60 * 60 * 1000,
    }

    return quantity * (conversions[unit] || 0)
  }

  public getGeneratedResources(): FHIRResource[] {
    return this.context.resources
  }

  public getContext(): GeneratorContext {
    return this.context
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  // Example patient
  const patient: Patient = {
    resourceType: 'Patient',
    id: 'example-patient-123',
    name: [{ given: ['John'], family: 'Doe' }],
    birthDate: '2015-01-15',
    gender: 'male',
  }

  // Example graph (simplified asthma model)
  const asthmaGraph: GraphJSON = {
    name: 'Asthma',
    nodes: {
      Initial: {
        type: 'Initial',
        name: 'Initial',
        direct_transition: 'Delay_For_Atopy',
      },
      Delay_For_Atopy: {
        type: 'Delay',
        name: 'Delay_For_Atopy',
        exact: { quantity: 1, unit: 'weeks' },
        direct_transition: 'Asthma_Incidence',
      },
      Asthma_Incidence: {
        type: 'Simple',
        name: 'Asthma_Incidence',
        direct_transition: 'Delay_For_Childhood_Asthma',
      },
      Delay_For_Childhood_Asthma: {
        type: 'Delay',
        name: 'Delay_For_Childhood_Asthma',
        range: { low: 2, high: 5, unit: 'years' },
        direct_transition: 'Childhood_Asthma_Begins',
      },
      Childhood_Asthma_Begins: {
        type: 'ConditionOnset',
        name: 'Childhood_Asthma_Begins',
        assign_to_attribute: 'asthma_condition',
        codes: [
          {
            system: 'SNOMED-CT',
            code: '233678006',
            display: 'Childhood asthma (disorder)',
          },
        ],
        direct_transition: 'Asthma_Diagnosis',
      },
      Asthma_Diagnosis: {
        type: 'Encounter',
        name: 'Asthma_Diagnosis',
        encounter_class: 'ambulatory',
        reason: 'asthma_condition',
        codes: [
          {
            system: 'SNOMED-CT',
            code: '185345009',
            display: 'Encounter for symptom (procedure)',
          },
        ],
        direct_transition: 'End_Diagnosis_Encounter',
      },
      End_Diagnosis_Encounter: {
        type: 'EncounterEnd',
        name: 'End_Diagnosis_Encounter',
        direct_transition: 'Terminal',
      },
      Terminal: {
        type: 'Terminal',
        name: 'Terminal',
      },
    },
  }

  // Generate FHIR resources
  const generator = new FHIRDiseaseProgressionGenerator(
    patient,
    new Date('2015-01-15')
  )
  const resources = await generator.processGraph(asthmaGraph)

  console.log('\n=== Generated FHIR Resources ===\n')
  console.log(JSON.stringify(resources, null, 2))
}

// Uncomment to run example
main().catch(console.error)

export {
  FHIRDiseaseProgressionGenerator,
  FHIRResource,
  GeneratorContext,
  GraphJSON,
  Patient,
}
